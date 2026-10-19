# k8s-helm-lab

Labo pratique de la formation **Kubernetes + Helm (niveau senior)**. On déploie la même application
de deux façons : d'abord avec des manifests YAML (`kubectl apply`), puis avec un chart Helm. Ensuite
on casse volontairement des choses pour apprendre à déboguer, et on pratique l'administration.

## Prérequis sur ta machine

- Docker (ou Podman)
- [kind](https://kind.sigs.k8s.io/) v0.33+, `kubectl` 1.36+, `helm` 4.x

## Démarrage

```bash
git clone https://github.com/georgesmomo/k8s-helm-lab && cd k8s-helm-lab
kind create cluster --name lab --config kind/cluster.yaml     # 1 control plane + 2 workers
docker build -t kubelab:1.0.0 --build-arg VERSION=1.0.0 app
kind load docker-image kubelab:1.0.0 --name lab
```

## Partie 1 · kubectl apply

```bash
kubectl apply -k manifests/          # ou : kubectl apply -f manifests/ (sauf 10-httproute.yaml sans Gateway)
kubectl -n kubelab rollout status deploy/kubelab
kubectl -n kubelab get all,pdb,hpa,networkpolicy
kubectl apply -f workloads/job-cronjob.yaml
kubectl -n kubelab logs job/smoke-test
```

## Partie 2 · Helm

```bash
helm lint chart/kubelab
helm template demo chart/kubelab | less
helm install demo chart/kubelab -n kubelab-helm --create-namespace --wait
helm test demo -n kubelab-helm --logs
helm upgrade demo chart/kubelab -n kubelab-helm --set message="Version 2" --wait
helm history demo -n kubelab-helm
helm rollback demo 1 -n kubelab-helm
```

## Partie 3 · Debug

Voir [debug/README.md](debug/README.md) : 10 pannes réelles (ImagePullBackOff, CrashLoopBackOff,
OOMKilled, Pending, readiness, Service sans endpoints, ConfigMap manquante, PVC Pending, RBAC, liveness).

## Structure

| Dossier | Contenu |
|---|---|
| `app/` | API Go (bibliothèque standard), Dockerfile multi-étapes distroless |
| `manifests/` | Namespace, ConfigMap, Secret, ServiceAccount, Deployment, Service, PDB, HPA, NetworkPolicy, quota, HTTPRoute, kustomization |
| `workloads/` | StatefulSet + Service headless, Job + CronJob, RBAC développeur |
| `chart/kubelab/` | Chart Helm : helpers, checksum de config, hook de migration, test, schéma de values, values-prod |
| `debug/` | Scénarios de panne et correctifs |
| `kind/` | Configuration du cluster local |
| `.github/workflows/ci.yml` | La CI rejoue tout le labo sur kind à chaque push |

Nettoyage : `kind delete cluster --name lab`.

> `kind/sandbox-cluster.yaml` est la variante utilisée pour produire les sorties du guide dans un
> environnement sans accès aux registres publics (hôte cgroup v1, miroir de registre local).
> Sur ta machine, utilise `kind/cluster.yaml`.
