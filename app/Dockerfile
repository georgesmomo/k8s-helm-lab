# Build multi-étapes : l'image finale ne contient que le binaire statique.
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /out/kubelab .

# distroless/static : pas de shell, pas de gestionnaire de paquets, utilisateur non root.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/kubelab /kubelab
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/kubelab"]
