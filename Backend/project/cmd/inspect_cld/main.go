package main

import (
	"fmt"
	"reflect"

	"github.com/cloudinary/cloudinary-go/v2"
)

func main() {
	cld, _ := cloudinary.NewFromParams("cloud", "key", "secret")

	file, _ := cld.File("test")
	fmt.Printf("File type: %T\n", file)

	t := reflect.TypeOf(file)
	for i := 0; i < t.NumMethod(); i++ {
		m := t.Method(i)
		fmt.Println("File Method:", m.Name)
	}
}
