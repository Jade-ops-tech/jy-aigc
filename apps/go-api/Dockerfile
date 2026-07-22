# syntax=docker/dockerfile:1.7

FROM golang:1.26.5-bookworm AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG TARGETARCH
ARG TARGETOS
RUN CGO_ENABLED=0 GOARCH=${TARGETARCH} GOOS=${TARGETOS} \
	go build -trimpath -ldflags="-s -w" -o /out/go-api ./cmd/api

FROM scratch

COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build --chown=65532:65532 /out/go-api /go-api

USER 65532:65532
EXPOSE 3002

ENTRYPOINT ["/go-api"]
