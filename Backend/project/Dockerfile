# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files from Backend/project
COPY Backend/project/go.mod Backend/project/go.sum ./
RUN go mod download

# Copy source code from Backend/project
COPY Backend/project/ .

# Build the binary with minimal memory usage
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

# Final stage - use scratch for minimal size
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates
RUN apk --no-cache add ca-certificates

# Copy binary from builder
COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations

# Expose port
EXPOSE 8080

# Run the server
CMD ["./server"]
