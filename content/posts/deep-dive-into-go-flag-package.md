---
date: '2025-03-22T21:42:54Z'
draft: false
title: 'Advanced flag parsing in standard Go'
tags:
- golang
- snippets
---

Over time, a plethora of libraries were developed to build complex CLI
applications; `spf13/cobra` and `urfave/cli` being probably the most used ones
(both have tens of thousands stars on GitHub). While they offer lots of features
out of the box, I often found them complex and overkill for my needs.

In this post, we will have an overview of how Go's `flag` works and see some
advanced uses of it. We will then try to implement parsing of complex values
such as comma-separated arguments or slices.

## The basics

The `flag` package implements flag sets and flags. It can look a bit overwhelming
but the basic usage generally boils down to declaring flags and calling a parsing
function:

```go
func main() {
    path := flag.String("config", "", "configuration file `path`")
    flag.Parse()
    fmt.Println(*path)
}
```

The function above defines a `config` flag that will store the parsed value in a
variable pointed by `path`. Note the backticks around `` `path` `` in the usage
string; it will be used as a placeholder when printing Usage:

```plain
$ go run main.go -h
Usage:
  -config path
        configuration file path
```

Flags may be defined by calling functions named after the type of data that
needs to be parsed. Basic types are available:

```go
// These functions defines a named flag with a default value and usage string.
// The returned value is the address of a variable storing the parsed value.
func (f *FlagSet) Bool(name string, value bool, usage string) *bool
func (f *FlagSet) String(name string, value string, usage string) *string
func (f *FlagSet) Int(name string, value int, usage string) *int
```

These also have a `Var` variant that will store the value in a pre-declared
variable. An usage example would be the configuration of a package variable:

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

Finally, the `Func` flag will call a function with the flag value as a parameter.
It however does not allow setting a default value.
The `BoolFunc` flag works similarly, but does not require a value to use the flag.
The function will then be called as if the flag was set as `-name=true`.

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

## Parsing custom types

The package also provides ways to parse more complex objects.

### Using `Func`

This may be done using the `Func` flag:

```go
func main() {
    var person struct{ firstname, lastname string }
    flag.Func("person", "configure person (`firstname:lastname`)", func(s string) error {
        var cut bool
        person.firstname, person.lastname, cut = strings.Cut(s, ":")
        if !cut {
            return errors.New("invalid format")
        }
        return nil
    })
    flag.Parse()
}
```

This can feel quite hacky/messy, so I would not use this unless the configured
object is limited in scope and has a simple parsing function. And this does not
fully support default values as well.

### Using the `Value` interface

#### Custom implementation

In our example, the proper way would be to define a `person` type implementing
the `flag.Value` interface and use the `flag.Var` function:

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

#### Generic stringer implementation

We can leverage `fmt.Stringer` to create a generic value allowing us to use any
type implementing this interface as a flag value.

```go
type stringerValue[T fmt.Stringer] struct {
    p     *T
    parse func(string) (T, error)
}

func (s stringerValue[T]) String() string {
    if s.p == nil {
        return ""
    }
    return (*s.p).String()
}

func (s stringerValue[T]) Set(value string) error {
    parsed, err := s.parse(value)
    if err != nil {
        return err
    }
    *s.p = parsed
    return nil
}

func StringerValue[T fmt.Stringer](p *T, parse func(string) (T, error)) flag.Value {
    return stringerValue[T]{p, parse}
}

func main() {
    u := &url.URL{}
    a := &mail.Address{Address: "foo@example.com"}
    ip := netip.MustParseAddr("127.0.0.1")
    flag.Var(StringerValue(&u, url.Parse), "url", "")
    flag.Var(StringerValue(&a, mail.ParseAddress), "mail", "")
    flag.Var(StringerValue(&ip, netip.ParseAddr), "ip", "")
    flag.Parse()
    fmt.Println(u, a, ip)
}
```

## Environment configuration

It may not be obvious, but the standard library provides enough tools to parse environment
variables along with command line flags, a common feature in CLI libraries.

The following example parses environment variables to override default command
line flag values, using a mapping function to convert flag names to environment
variable names.

```go
func main() {
    path := flag.String("config", "", "configuration file `path`")
    flag.VisitAll(func(f *flag.Flag) {
        // Map every command line flag to the corresponding environment variable
        env := f.Name
        env = strings.NewReplacer(".", "_", "-", "").Replace(env)
        env = strings.ToUpper(env)
        f.Value.Set(os.Getenv(env))
    })
    flag.Parse()
    fmt.Println(*path)
}
```
