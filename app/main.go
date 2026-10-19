// kubelab : petite API HTTP pensée pour apprendre Kubernetes.
// Elle expose des sondes, des métriques et des points de « panne volontaire »
// (CPU, mémoire, crash au démarrage) pour les scénarios de debug du labo.
// Bibliothèque standard uniquement : l'image finale ne contient qu'un binaire.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

var version = "dev" // injecté au build : -ldflags "-X main.version=1.2.0"

type app struct {
	message  string
	dataDir  string
	ready    atomic.Bool
	requests atomic.Int64
	mu       sync.Mutex
	hog      [][]byte
	log      *slog.Logger
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// Sous-commandes utilisées par les Jobs et les hooks Helm.
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "migrate":
			os.Exit(migrate(log))
		case "check":
			os.Exit(check(log, os.Args[2:]))
		case "version":
			fmt.Println(version)
			return
		}
	}

	if env("FAIL_ON_START", "false") == "true" {
		log.Error("FAIL_ON_START=true : arrêt volontaire", "hint", "scénario CrashLoopBackOff")
		os.Exit(1)
	}
	if env("DATABASE_URL", "") == "" && env("REQUIRE_DATABASE_URL", "false") == "true" {
		log.Error("variable DATABASE_URL absente", "hint", "vérifie le Secret référencé par le Deployment")
		os.Exit(2)
	}

	a := &app{message: env("MESSAGE", "Hello from kubelab"), dataDir: os.Getenv("DATA_DIR"), log: log}
	if f := os.Getenv("CONFIG_FILE"); f != "" {
		if b, err := os.ReadFile(f); err == nil {
			log.Info("configuration chargée", "file", f, "bytes", len(b))
		} else {
			log.Warn("configuration illisible", "file", f, "err", err.Error())
		}
	}

	delay, _ := strconv.Atoi(env("STARTUP_DELAY_SECONDS", "0"))
	go func() {
		time.Sleep(time.Duration(delay) * time.Second)
		a.ready.Store(true)
		log.Info("prêt à recevoir du trafic")
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", a.root)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok\n")) })
	mux.HandleFunc("GET /readyz", a.readyz)
	mux.HandleFunc("GET /version", func(w http.ResponseWriter, _ *http.Request) { fmt.Fprintln(w, version) })
	mux.HandleFunc("GET /metrics", a.metrics)
	mux.HandleFunc("GET /stress/cpu", a.stressCPU)
	mux.HandleFunc("GET /stress/memory", a.stressMemory)

	port := env("PORT", "8080")
	srv := &http.Server{Addr: ":" + port, Handler: a.count(mux), ReadHeaderTimeout: 5 * time.Second}

	go func() {
		log.Info("démarrage", "version", version, "port", port, "pod", env("POD_NAME", hostname()))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("serveur arrêté", "err", err.Error())
			os.Exit(1)
		}
	}()

	// Arrêt propre : Kubernetes envoie SIGTERM, puis SIGKILL après terminationGracePeriodSeconds.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	sig := <-stop
	a.ready.Store(false)
	log.Info("signal reçu, arrêt propre", "signal", sig.String())
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	log.Info("arrêt terminé")
}

func hostname() string { h, _ := os.Hostname(); return h }

func (a *app) count(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		a.requests.Add(1)
		next.ServeHTTP(w, r)
	})
}

func (a *app) visits() int64 {
	if a.dataDir == "" {
		return a.requests.Load()
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	p := filepath.Join(a.dataDir, "visits")
	b, _ := os.ReadFile(p)
	n, _ := strconv.ParseInt(strings.TrimSpace(string(b)), 10, 64)
	n++
	if err := os.WriteFile(p, []byte(strconv.FormatInt(n, 10)), 0o644); err != nil {
		a.log.Error("écriture impossible", "dir", a.dataDir, "err", err.Error())
	}
	return n
}

func (a *app) root(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"message": a.message,
		"version": version,
		"pod":     env("POD_NAME", hostname()),
		"node":    env("NODE_NAME", ""),
		"visits":  a.visits(),
	})
}

func (a *app) readyz(w http.ResponseWriter, _ *http.Request) {
	if !a.ready.Load() {
		http.Error(w, "not ready", http.StatusServiceUnavailable)
		return
	}
	w.Write([]byte("ready\n"))
}

func (a *app) metrics(w http.ResponseWriter, _ *http.Request) {
	fmt.Fprintf(w, "# TYPE kubelab_http_requests_total counter\nkubelab_http_requests_total %d\n", a.requests.Load())
	fmt.Fprintf(w, "# TYPE kubelab_info gauge\nkubelab_info{version=%q} 1\n", version)
}

// /stress/cpu?seconds=30 : occupe un cœur (déclenche le HPA).
func (a *app) stressCPU(w http.ResponseWriter, r *http.Request) {
	s, _ := strconv.Atoi(r.URL.Query().Get("seconds"))
	if s <= 0 || s > 300 {
		s = 30
	}
	end := time.Now().Add(time.Duration(s) * time.Second)
	x := 0
	for time.Now().Before(end) {
		x++
	}
	fmt.Fprintf(w, "cpu burned for %ds\n", s)
}

// /stress/memory?mb=300 : alloue et garde la mémoire (déclenche OOMKilled si > limite).
func (a *app) stressMemory(w http.ResponseWriter, r *http.Request) {
	mb, _ := strconv.Atoi(r.URL.Query().Get("mb"))
	if mb <= 0 {
		mb = 64
	}
	a.mu.Lock()
	for i := 0; i < mb; i++ {
		b := make([]byte, 1<<20)
		for j := range b {
			b[j] = 1
		}
		a.hog = append(a.hog, b)
	}
	total := len(a.hog)
	a.mu.Unlock()
	a.log.Warn("mémoire allouée", "held_mb", total)
	fmt.Fprintf(w, "holding %d MiB\n", total)
}

func migrate(log *slog.Logger) int {
	log.Info("migration du schéma", "from", env("FROM_VERSION", "?"), "to", version)
	time.Sleep(2 * time.Second)
	log.Info("migration terminée")
	return 0
}

// check URL [attendu] : utilisé par « helm test » et les Jobs de smoke test.
func check(log *slog.Logger, args []string) int {
	if len(args) == 0 {
		log.Error("usage: kubelab check URL [texte-attendu]")
		return 2
	}
	c := &http.Client{Timeout: 5 * time.Second}
	var last error
	for i := 0; i < 10; i++ {
		resp, err := c.Get(args[0])
		if err == nil {
			var buf [4096]byte
			n, _ := resp.Body.Read(buf[:])
			resp.Body.Close()
			body := string(buf[:n])
			if resp.StatusCode == 200 && (len(args) < 2 || strings.Contains(body, args[1])) {
				log.Info("check OK", "url", args[0], "status", resp.StatusCode, "body", strings.TrimSpace(body))
				return 0
			}
			last = fmt.Errorf("status %d body %q", resp.StatusCode, body)
		} else {
			last = err
		}
		time.Sleep(2 * time.Second)
	}
	log.Error("check KO", "url", args[0], "err", last.Error())
	return 1
}
