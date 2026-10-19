# Scénarios de panne

Chaque fichier reproduit une panne fréquente en production. Méthode :

1. `kubectl apply -f 00-namespace.yaml -f NN-xxx.yaml`
2. Observer : `kubectl -n debug get pods`, `kubectl -n debug describe pod <pod>`,
   `kubectl -n debug logs <pod> [--previous]`, `kubectl -n debug get events --sort-by=.lastTimestamp`
3. Trouver la cause dans le fichier (commentaire en tête), corriger, ré-appliquer.

| # | Symptôme | Première commande utile |
|---|----------|-------------------------|
| 01 | ImagePullBackOff | `describe pod` → Events |
| 02 | CrashLoopBackOff | `logs --previous` |
| 03 | OOMKilled | `describe pod` → Last State |
| 04 | Pending | `describe pod` → FailedScheduling |
| 05 | READY 0/1 | `describe pod` → Readiness probe failed |
| 06 | Service sans réponse | `get endpointslices -l kubernetes.io/service-name=web` |
| 07 | CreateContainerConfigError | `describe pod` → Events |
| 08 | PVC Pending | `describe pvc data` |
| 09 | Forbidden | `kubectl auth can-i list pods --as=system:serviceaccount:debug:reader -n debug` |
| 10 | Redémarrages en boucle | `describe pod` → Liveness probe failed |

Nettoyage : `kubectl delete namespace debug`.
