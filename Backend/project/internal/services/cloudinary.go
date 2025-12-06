package services

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"time"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

type CloudinaryService struct {
	cld *cloudinary.Cloudinary
}

func NewCloudinaryService(cloudName, apiKey, apiSecret string) (*CloudinaryService, error) {
	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Cloudinary: %w", err)
	}

	return &CloudinaryService{cld: cld}, nil
}

// UploadDocument uploads a document to Cloudinary
func (s *CloudinaryService) UploadDocument(file multipart.File, filename string, folderPath string, resourceType string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Default to "auto" if not specified
	if resourceType == "" {
		resourceType = "auto"
	}

	// Upload file to Cloudinary
	uploadParams := uploader.UploadParams{
		Folder:       folderPath,
		ResourceType: resourceType,
		PublicID:     filename,
	}

	result, err := s.cld.Upload.Upload(ctx, file, uploadParams)
	if err != nil {
		return "", fmt.Errorf("failed to upload to Cloudinary: %w", err)
	}

	return result.SecureURL, nil
}

// UploadFromReader uploads file from an io.Reader
func (s *CloudinaryService) UploadFromReader(reader io.Reader, filename string, folderPath string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	uploadParams := uploader.UploadParams{
		Folder:       folderPath,
		ResourceType: "auto",
		PublicID:     filename,
	}

	result, err := s.cld.Upload.Upload(ctx, reader, uploadParams)
	if err != nil {
		return "", fmt.Errorf("failed to upload to Cloudinary: %w", err)
	}

	return result.SecureURL, nil
}

// DeleteDocument deletes a document from Cloudinary by public ID
func (s *CloudinaryService) DeleteDocument(publicID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := s.cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID: publicID,
	})

	if err != nil {
		return fmt.Errorf("failed to delete from Cloudinary: %w", err)
	}

	return nil
}
