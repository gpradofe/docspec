// Package minimal provides a Tier 1 DocSpec example in Go.
//
// Go does not support annotations or decorators, so DocSpec uses structured
// comments to convey documentation metadata. The processor scans for
// //docspec:<directive> comments attached to types and functions.
package minimal

import (
	"errors"
	"sync"
	"time"
)

//docspec:module id=go-minimal name="Cache Service" description="In-memory key-value cache with TTL expiration"

// CacheService is an in-memory key-value store with per-entry TTL support.
type CacheService struct {
	mu      sync.RWMutex
	entries map[string]*cacheEntry
	defaultTTL time.Duration
}

type cacheEntry struct {
	value     any
	expiresAt time.Time
}

// CacheStats holds summary statistics about the current cache state.
type CacheStats struct {
	// TotalEntries is the number of entries currently stored.
	TotalEntries int
	// ActiveEntries is the number of non-expired entries.
	ActiveEntries int
	// ExpiredEntries is the number of entries past their TTL.
	ExpiredEntries int
}

// NewCacheService creates a CacheService with the given default TTL.
func NewCacheService(defaultTTL time.Duration) *CacheService {
	return &CacheService{
		entries:    make(map[string]*cacheEntry),
		defaultTTL: defaultTTL,
	}
}

// Set stores a value under the given key with the default TTL.
func (c *CacheService) Set(key string, value any) {
	c.SetWithTTL(key, value, c.defaultTTL)
}

// SetWithTTL stores a value under the given key with a custom TTL.
func (c *CacheService) SetWithTTL(key string, value any, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[key] = &cacheEntry{
		value:     value,
		expiresAt: time.Now().Add(ttl),
	}
}

// Get retrieves the value associated with the given key.
// Returns the value and true if found and not expired, or nil and false otherwise.
func (c *CacheService) Get(key string) (any, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, ok := c.entries[key]
	if !ok {
		return nil, false
	}
	if time.Now().After(entry.expiresAt) {
		return nil, false
	}
	return entry.value, true
}

// Delete removes the entry for the given key.
// Returns an error if the key does not exist.
func (c *CacheService) Delete(key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if _, ok := c.entries[key]; !ok {
		return errors.New("key not found: " + key)
	}
	delete(c.entries, key)
	return nil
}

// Stats returns summary statistics about the cache.
func (c *CacheService) Stats() CacheStats {
	c.mu.RLock()
	defer c.mu.RUnlock()

	now := time.Now()
	stats := CacheStats{TotalEntries: len(c.entries)}
	for _, entry := range c.entries {
		if now.Before(entry.expiresAt) {
			stats.ActiveEntries++
		} else {
			stats.ExpiredEntries++
		}
	}
	return stats
}

//docspec:hidden

// evictExpired removes all entries whose TTL has passed.
// This is an internal maintenance function, not part of the public API.
func (c *CacheService) evictExpired() int {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	count := 0
	for key, entry := range c.entries {
		if now.After(entry.expiresAt) {
			delete(c.entries, key)
			count++
		}
	}
	return count
}

//docspec:hidden

// rehash rebuilds internal data structures — implementation detail.
func (c *CacheService) rehash() {
	// internal optimization, not part of the public API
}
