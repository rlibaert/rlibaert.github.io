---
date: '2025-03-22T21:42:54Z'
draft: true
title: 'Parse flags like a boss in standard Go'
tags:
- golang
---

Most CLI applications require bits of configuration when being invoked. In Go, this can be done natively using the `flag` package. It proposes a simple interface for defining argument flags sets, but may feel like it is lacking some functionality. Over time, a plethora of libraries were developed; `spf13/cobra` and `urfave/cli` being probably the most used ones (both have tens of thousands stars on GitHub).

While they offer lots of features out of the box, I often found them quite complicated and a bit overkill for my needs. I wanted to understand how they worked and try getting the bare minimum of their functionality with as little code as possible.

In this post, we will have an overview of how Go's `flag` works and see some advanced uses of it. We will then try to implement parsing of complex values such as comma-separated arguments or slices.

## The basics of flag parsing

The `flag` package looks a bit overwhelming but it actually is not that complicated. Most of the time, users will only need to declare flags and make a call to do the parsing:

```go
func main() {
	path := flag.String("config", "", "configuration file `path`")
	flag.Parse()
	fmt.Println(*path)
}
```

The function above defines a `config` flag that will store the parsed value in a variable pointed by `path`. Note the backticks around `` `path` `` in the usage string; it will be used as a placeholder when printing Usage:

```plain
$ go run main.go -h
Usage:
  -config path
    	configuration file path
```

Flags may be defined by calling functions named after the type of data that needs to be parsed. Basic types are usually available. For instance:

```go
// These functions defines a named flag with a default value and usage string.
// The returned value is the address of a variable storing the parsed value.
func (f *FlagSet) Bool(name string, value bool, usage string) *bool
func (f *FlagSet) String(name string, value string, usage string) *string
func (f *FlagSet) Int(name string, value int, usage string) *int
```

These also have a `Var` variant that will store the value in a pre-declared variable. An usage example would be the configuration of a package variable:

```go
package mypkg

var Foo = "foo"
```
```go
func main() {
	flag.StringVar(&mypkg.Foo, "foo", mypkg.Foo, "configure mypkg.Foo")
	flag.Parse()
}
```
```plain
$ go run main.go -h
Usage:
  -foo string
    	configure mypkg.Foo (default "foo")
```

Finally, the `Func` flag will call a function with the flag value as a parameter. It however does not allow setting a default value.
The `BoolFunc` flag works similarly, but does not require a value to use the flag. The function will then be called as if the flag was set as `-name=true`.

```go
func main() {
	flag.BoolFunc("version", "print version and exit", func(string) error {
		fmt.Println("x.y.z")
		os.Exit(0)
		return nil
	})
	flag.Parse()
}
```

## Parsing user-defined values

Parsing basic types is cool but you will probably need to parse more complex objects. This may be done using the `Func` flag:

```go
func main() {
	var person struct{ firstname, lastname string }
	flag.Func("person", "configure person (`firstname:lastname`)", func(s string) (err error) {
		var cut bool
		person.firstname, person.lastname, cut = strings.Cut(s, ":")
		if !cut {
			err = errors.New("invalid format")
		}
		return
	})
	flag.Parse()
}
```

This can feel quite hacky/messy, so I would not use this unless the configured object is limited in scope and has a simple parsing function. And this does not fully support default values as well.

In our example, the proper way would be to define a `person` type implementing the `flag.Value` interface and use the `flag.Var` function:

```go
type person struct{ firstname, lastname string }

// String implements [flag.Value] and [fmt.Stringer]
// This method requires a proper implementation, otherwise the [flag]
// package may fail to determine whether a default value was set
func (p *person) String() string {
	if p == nil { // The [flag] package may call the method on a zero-valued receiver
		return ":"
	}
	return fmt.Sprintf("%s:%s", p.firstname, p.lastname)
}

// Set implements [flag.Value]
func (p *person) Set(s string) (err error) {
	var cut bool
	p.firstname, p.lastname, cut = strings.Cut(s, ":")
	if !cut {
		err = errors.New("invalid format")
	}
	return
}

func main() {
	person := person{"john", "doe"}
	flag.Var(&person, "person", "configure person (`firstname:lastname`)")
	flag.Parse()
}
```

We can also implement the `Set` method to parse comma-separated lists of values:

```go
type names []string

func (x *names) String() string {
	if x == nil || len(*x) == 0 {
		return ""
	}
	return fmt.Sprint(*x)
}

func (x *names) Set(s string) error {
	*x = strings.Split(s, ",")
	return nil
}
```

From here, I realized how difficult it was to make a library with an interface that is precise, easy to use but also flexible. I gave it a try but always endend up getting something either opinionated or relying on non-native types.

Indeed, in the last snippet of code, we are splitting the flag value to store sub elements into a slice. This implies that the slice will contain only the elements of the last parsed flag, and this may or may not be what is needed. There is a lot of variants that can be though of:

```go
// Parses semicolon separated values
func (x *names) Set(s string) error {
	*x = strings.Split(s, ";")
	return nil
}

// Parses whitespace separated values
func (x *names) Set(s string) error {
	*x = strings.Fields(s)
	return nil
}

// Parses whitespace separated values
// Values are appended over multiple flags
func (x *names) Set(s string) error {
	*x = append(*x, strings.Fields(s)...)
	return nil
}

// Values are appended over multiple flags as is
func (x *names) Set(s string) error {
	*x = append(*x, s)
	return nil
}
```
