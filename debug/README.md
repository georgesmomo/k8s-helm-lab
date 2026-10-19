# Failure scenarios

Each file reproduces a failure that is common in production. Method:

1. `kubectl apply -f 00-namespace.yaml -f NN-xxx.yaml`
2. Observe: `kubectl -n debug get pods`, `kubectl -n debug describe pod <pod>`,
   `kubectl -n debug logs <pod> [--previous]`, `kubectl -n debug get events --sort-by=.lastTimestamp`
3. Find the cause (try first without reading the comment at the top of the file), fix it, apply again.

| # | Symptom | First useful command |
|---|---------|----------------------|
| 01 | ImagePullBackOff | `describe pod` → Events |
| 02 | CrashLoopBackOff | `logs --previous` |
| 03 | OOMKilled | `describe pod` → Last State |
| 04 | Pending | `describe pod` → FailedScheduling |
| 05 | READY 0/1 | `describe pod` → Readiness probe failed |
| 06 | Service does not answer | `get endpointslices -l kubernetes.io/service-name=web` |
| 07 | CreateContainerConfigError | `describe pod` → Events |
| 08 | PVC Pending | `describe pvc data` |
| 09 | Forbidden | `kubectl auth can-i list pods --as=system:serviceaccount:debug:reader -n debug` |
| 10 | Restart loop | `describe pod` → Liveness probe failed |

The fix for scenario 09 is in [`fixes/09-rbac.yaml`](fixes/09-rbac.yaml). Scenario 03 needs a trigger:
`kubectl -n debug exec deploy/oom -- /kubelab check 'http://localhost:8080/stress/memory?mb=100'`.

The interactive course walks through every scenario with the real output captured on the lab cluster:
<https://georgesmomo.github.io/k8s-helm-lab/#debug>.

Clean up: `kubectl delete namespace debug`.
