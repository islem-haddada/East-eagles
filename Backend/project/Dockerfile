# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git for go modules
RUN apk add --no-cache git

# Copy go mod files from Backend/project
COPY Backend/project/go.mod Backend/project/go.sum ./
RUN go mod download

# Copy source code from Backend/project
COPY Backend/project/ .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Final stage
FROM alpine:latest

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Create uploads directory
RUN mkdir -p /app/uploads/documents

# Copy binary from builder
COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations

# Expose port
EXPOSE 8080

# Run the server
CMD ["./server"]
