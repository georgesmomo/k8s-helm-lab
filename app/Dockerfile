# Multi-stage build: the final image only contains the static binary.
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /out/kubelab .

# distroless/static: no shell, no package manager, non-root user.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/kubelab /kubelab
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/kubelab"]
