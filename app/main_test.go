package main

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func newApp() *app {
	a := &app{message: "test", log: slog.New(slog.NewTextHandler(os.Stderr, nil))}
	return a
}

func TestRoot(t *testing.T) {
	a := newApp()
	rr := httptest.NewRecorder()
	a.root(rr, httptest.NewRequest("GET", "/", nil))
	if rr.Code != http.StatusOK || !strings.Contains(rr.Body.String(), `"message":"test"`) {
		t.Fatalf("unexpected %d %s", rr.Code, rr.Body.String())
	}
}

func TestReadyz(t *testing.T) {
	a := newApp()
	rr := httptest.NewRecorder()
	a.readyz(rr, httptest.NewRequest("GET", "/readyz", nil))
	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 before ready, got %d", rr.Code)
	}
	a.ready.Store(true)
	rr = httptest.NewRecorder()
	a.readyz(rr, httptest.NewRequest("GET", "/readyz", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
}

func TestVisitsPersisted(t *testing.T) {
	a := newApp()
	a.dataDir = t.TempDir()
	a.visits()
	if n := a.visits(); n != 2 {
		t.Fatalf("expected 2, got %d", n)
	}
}
