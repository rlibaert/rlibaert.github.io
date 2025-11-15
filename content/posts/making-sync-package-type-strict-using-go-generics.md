---
date: '2025-03-20T17:20:54Z'
draft: false
title: 'Making sync package type strict using Go generics'
tags:
- golang
- snippets
---

The `sync` package from Go's standard library provides primitives (`Mutex`, `WaitGroup`, ...) to help solving synchronization problems. This is an older package and some of the implementations could be different if the generic features were available then.

Indeed, the `sync.Pool` and `sync.Map` facilitates concurrent usage for storing and retrieving data in different situations. Those features are pretty elementary and their functionality highly relies on the fact that they can be used with *`any`* type, which comes with a few drawbacks. Giving up the type strictness prevents the compiler to detect potential errors or requires type assertion code. The former implies extra attention when writing code and the latter reduces its simplicity and readability.

In this post we will make use of generics to reduce the scope of risky code to a minimum while keeping the reusability of the original implementation.

## sync.Pool

Go's `sync.Pool` provides a way to reuse allocated objects, reducing pressure on the garbage collector. Using generics, we can wrap the original implementation to infer a type-specific implementation of the original pooling mechanism.

```go
// See [sync.Pool].
type Pool[T any] struct {
	pool sync.Pool
}

// New optionally specifies a function to generate a value when Get would
// otherwise have no item to return. It may not be changed concurrently with
// calls to Get.
func (p *Pool[T]) New(f func() T) *Pool[T] {
	if f != nil {
		p.pool.New = func() any { return f() }
	} else {
		p.pool.New = nil
	}
	return p
}

// Get removes an arbitrary item from the [Pool] and returns it to the caller.
// Get may choose to ignore the pool and treat it as empty. Callers should not
// assume any relation between values passed to [Pool.Put] and the values
// returned by Get. If Get would be unable to return an item and [Pool.New] was
// called with a non-nil function, Get returns the result of calling this
// function. If no item can be returned, Get returns the zero value.
func (p *Pool[T]) Get() (x T) {
	x, _ = p.pool.Get().(T)
	return
}

// Put adds x to the Pool.
func (p *Pool[T]) Put(x T) {
	p.pool.Put(x)
}
```

Pools can then be easily instantiated:

```go
// A pool of buffers, newly allocated
// buffers have an initial length of 512.
var _ = NewPool(func() []byte {
	return make([]byte, 512)
})

// It also implements existing interfaces
var _ = httputil.ReverseProxy{
	BufferPool: NewPool(func() []byte {
		return make([]byte, 4<<10)
	}),
}
````

## sync.Map

Go's `sync.Map` provides a map safe for concurrent use. Its use cases are kinda specific, caching being probably one of the most common one.

```go
type Map[K, V any] struct {
	m sync.Map
}

func (m *Map[K, V]) Clear() {
	m.m.Clear()
}

func (m *Map[K, V]) CompareAndDelete(key K, old V) (deleted bool) {
	return m.m.CompareAndDelete(key, old)
}

func (m *Map[K, V]) CompareAndSwap(key K, old V, new V) (swapped bool) {
	return m.m.CompareAndSwap(key, old, new)
}

func (m *Map[K, V]) Delete(key K) {
	m.m.Delete(key)
}

func (m *Map[K, V]) Load(key K) (value V, ok bool) {
	var v any
	v, ok = m.m.Load(key)
	if v != nil {
		value = v.(V)
	}
	return
}

func (m *Map[K, V]) LoadAndDelete(key K) (value V, loaded bool) {
	var v any
	v, loaded = m.m.LoadAndDelete(key)
	if v != nil {
		value = v.(V)
	}
	return
}

func (m *Map[K, V]) LoadOrStore(key K, value V) (actual V, loaded bool) {
	var v any
	v, loaded = m.m.LoadOrStore(key, value)
	if v != nil {
		actual = v.(V)
	}
	return
}

func (m *Map[K, V]) Range(f func(key K, value V) bool) {
	m.m.Range(func(key, value any) bool {
		var k K
		if key != nil {
			k = key.(K)
		}
		var v V
		if value != nil {
			v = value.(V)
		}
		return f(k, v)
	})
}

func (m *Map[K, V]) Store(key K, value V) {
	m.m.Store(key, value)
}

func (m *Map[K, V]) Swap(key K, value V) (previous V, loaded bool) {
	var v any
	v, loaded = m.m.Swap(key, value)
	if v != nil {
		previous = v.(V)
	}
	return
}
```

## Generic sync package

These snippets are properly implemented, tested and documented in a package that you can import into your code: `import "github.com/rlibaert/sync-generic"`.
