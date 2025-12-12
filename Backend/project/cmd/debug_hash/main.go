package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	// The hash we put in the DB
	hash := "$2a$12$WWAU5H5/90rm37VtEHAFKu8ibIbnYTM9WjhnlKdYB0x5byKqFwKdu"
	password := "admin123"

	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		fmt.Printf("Mismatch! Error: %v\n", err)
	} else {
		fmt.Println("Match!")
	}
}
