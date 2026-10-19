{{/* Nom court de l'application (tronqué à 63 caractères : limite DNS des noms Kubernetes). */}}
{{- define "kubelab.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Nom complet : <release>-<chart>, sauf si la release contient déjà le nom du chart. */}}
{{- define "kubelab.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "kubelab.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Labels recommandés (app.kubernetes.io/*) posés sur toutes les ressources. */}}
{{- define "kubelab.labels" -}}
helm.sh/chart: {{ include "kubelab.chart" . }}
{{ include "kubelab.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: k8s-helm-lab
{{- end }}

{{/* Labels de sélection : stables, ne jamais y mettre la version (le selector est immuable). */}}
{{- define "kubelab.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kubelab.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "kubelab.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "kubelab.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "kubelab.secretName" -}}
{{- if .Values.secret.existingSecret }}{{ .Values.secret.existingSecret }}{{ else }}{{ include "kubelab.fullname" . }}{{ end }}
{{- end }}

{{/* Image : le digest, s'il est fourni, l'emporte sur le tag (déploiement immuable). */}}
{{- define "kubelab.image" -}}
{{- if .Values.image.digest }}
{{- printf "%s@%s" .Values.image.repository .Values.image.digest }}
{{- else }}
{{- printf "%s:%s" .Values.image.repository (.Values.image.tag | default .Chart.AppVersion) }}
{{- end }}
{{- end }}
