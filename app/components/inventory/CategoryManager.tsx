/**
 * CategoryManager Component
 * Requirements: 5.4, 5.5, 5.6, 15.6 - Inline category management with optimistic updates
 * 
 * Provides inline list with add/edit/delete functionality using Shadcn UI components
 */

import * as React from 'react';
import { useFetcher } from '@remix-run/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface CategoryManagerProps {
  /** Initial categories to display */
  categories: Category[];
  /** Optional className for the container */
  className?: string;
}

interface EditingState {
  id: string | null;
  name: string;
}

/**
 * CategoryManager - Inline category management component
 * 
 * Features:
 * - Inline editing with optimistic updates
 * - Add new categories
 * - Edit existing category names
 * - Delete categories with confirmation
 * - Framer Motion animations for list changes
 */
export function CategoryManager({ categories: initialCategories, className }: CategoryManagerProps) {
  const fetcher = useFetcher<{ success: boolean; category?: Category; error?: string }>();
  const [categories, setCategories] = React.useState<Category[]>(initialCategories);
  const [editing, setEditing] = React.useState<EditingState>({ id: null, name: '' });
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const newInputRef = React.useRef<HTMLInputElement>(null);

  // Sync with initial categories when they change
  React.useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Handle fetcher response
  React.useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.success) {
        setError(null);
        // Reset editing state on success
        setEditing({ id: null, name: '' });
        setNewCategoryName('');
        setDeletingId(null);
      } else if (fetcher.data.error) {
        setError(fetcher.data.error);
        // Revert optimistic update on error
        setCategories(initialCategories);
      }
    }
  }, [fetcher.state, fetcher.data, initialCategories]);

  // Focus input when editing starts
  React.useEffect(() => {
    if (editing.id && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing.id]);

  const handleStartEdit = (category: Category) => {
    setEditing({ id: category.id, name: category.name });
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditing({ id: null, name: '' });
    setError(null);
  };

  const handleSaveEdit = () => {
    if (!editing.id || !editing.name.trim()) return;

    const trimmedName = editing.name.trim();
    const category = categories.find(c => c.id === editing.id);
    if (!category || category.name === trimmedName) {
      handleCancelEdit();
      return;
    }

    // Optimistic update
    setCategories(prev =>
      prev.map(c =>
        c.id === editing.id
          ? { ...c, name: trimmedName, slug: generateSlug(trimmedName) }
          : c
      )
    );

    // Submit to API
    fetcher.submit(
      { id: editing.id, name: trimmedName },
      { method: 'PUT', action: '/api/categories', encType: 'application/json' }
    );
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const trimmedName = newCategoryName.trim();
    const tempId = `temp-${Date.now()}`;
    const newCategory: Category = {
      id: tempId,
      tenant_id: '',
      name: trimmedName,
      slug: generateSlug(trimmedName),
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));

    // Submit to API
    fetcher.submit(
      { name: trimmedName },
      { method: 'POST', action: '/api/categories', encType: 'application/json' }
    );
  };

  const handleDeleteCategory = (id: string) => {
    if (deletingId === id) {
      // Confirm delete
      // Optimistic update
      setCategories(prev => prev.filter(c => c.id !== id));

      // Submit to API
      fetcher.submit(
        { id },
        { method: 'DELETE', action: '/api/categories', encType: 'application/json' }
      );
    } else {
      // First click - show confirmation
      setDeletingId(id);
    }
  };

  const handleCancelDelete = () => {
    setDeletingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: 'edit' | 'add') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'edit') {
        handleSaveEdit();
      } else {
        handleAddCategory();
      }
    } else if (e.key === 'Escape') {
      if (action === 'edit') {
        handleCancelEdit();
      } else {
        setNewCategoryName('');
      }
    }
  };

  const isLoading = fetcher.state !== 'idle';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add new category */}
      <div className="flex gap-2">
        <Input
          ref={newInputRef}
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'add')}
          placeholder="New category name..."
          disabled={isLoading}
          className="flex-1"
          aria-label="New category name"
        />
        <Button
          onClick={handleAddCategory}
          disabled={!newCategoryName.trim() || isLoading}
          aria-label="Add category"
        >
          {isLoading && fetcher.formMethod === 'POST' ? 'Adding...' : 'Add'}
        </Button>
      </div>

      {/* Categories table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                    No categories yet. Add one above.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <motion.tr
                    key={category.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      {editing.id === category.id ? (
                        <Input
                          ref={inputRef}
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, 'edit')}
                          onBlur={handleSaveEdit}
                          disabled={isLoading}
                          className="h-8"
                          aria-label="Edit category name"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary"
                          onClick={() => handleStartEdit(category)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleStartEdit(category)}
                          aria-label={`Edit ${category.name}`}
                        >
                          {category.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {editing.id === category.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={isLoading}
                              aria-label="Save changes"
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={isLoading}
                              aria-label="Cancel editing"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : deletingId === category.id ? (
                          <>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              disabled={isLoading}
                              aria-label="Confirm delete"
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelDelete}
                              disabled={isLoading}
                              aria-label="Cancel delete"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(category)}
                              disabled={isLoading}
                              aria-label={`Edit ${category.name}`}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              disabled={isLoading}
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete ${category.name}`}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Category count */}
      <p className="text-sm text-muted-foreground">
        {categories.length} {categories.length === 1 ? 'category' : 'categories'}
      </p>
    </div>
  );
}

/**
 * Generates a URL-safe slug from a category name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default CategoryManager;
