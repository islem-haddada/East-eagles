package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	bytes, err := bcrypt.GenerateFromPassword([]byte("admin123"), 12)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(bytes))
}
