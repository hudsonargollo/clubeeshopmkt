/**
 * Inventory Edit Drawer Component
 * Requirements: 11.2 - Use bottom-sheet Drawers for mobile editing
 * 
 * Mobile-friendly drawer for editing inventory items
 */

import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '~/components/ui/drawer';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { usePresence } from '~/hooks/usePresence';
import { cn } from '~/lib/utils';

export interface InventoryItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  image_url: string | null;
}

export interface InventoryEditDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** The inventory item to edit */
  item: InventoryItem | null;
  /** Callback when item is saved */
  onSave: (item: InventoryItem) => void;
  /** Callback when item is deleted */
  onDelete?: (itemId: string) => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Presence configuration for collision prevention */
  presenceConfig?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    userId: string;
    displayName: string;
  };
}

/**
 * InventoryEditDrawer - Mobile drawer for editing inventory items
 * 
 * Features:
 * - Bottom sheet design for mobile
 * - Form validation
 * - Presence integration for edit collision prevention
 * - Stock adjustment controls
 */
export function InventoryEditDrawer({
  open,
  onOpenChange,
  item,
  onSave,
  onDelete,
  isSaving = false,
  presenceConfig,
}: InventoryEditDrawerProps) {
  const [formData, setFormData] = React.useState<InventoryItem | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Presence for edit collision prevention
  const presence = presenceConfig && item ? usePresence({
    ...presenceConfig,
    channelName: `inventory:${item.id}`,
    enabled: open,
  }) : null;

  // Initialize form data when item changes
  React.useEffect(() => {
    if (item) {
      setFormData({ ...item });
      setErrors({});
    }
  }, [item]);

  // Join presence when drawer opens
  React.useEffect(() => {
    if (open && presence) {
      presence.join('all');
    }
    return () => {
      if (presence) {
        presence.leave();
      }
    };
  }, [open, presence]);

  const handleChange = (field: keyof InventoryItem, value: string | number) => {
    if (!formData) return;
    
    setFormData({
      ...formData,
      [field]: value,
    });
    
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = (): boolean => {
    if (!formData) return false;
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.barcode.trim()) {
      newErrors.barcode = 'Barcode is required';
    }
    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!formData || !validate()) return;
    onSave(formData);
  };

  const handleStockAdjust = (delta: number) => {
    if (!formData) return;
    const newStock = Math.max(0, formData.stock + delta);
    handleChange('stock', newStock);
  };

  if (!item || !formData) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Edit Inventory Item</DrawerTitle>
          <DrawerDescription>
            {item.barcode} • {item.category}
          </DrawerDescription>
          
          {/* Presence indicator */}
          {presence?.isBeingEditedByOther && presence.editingUser && (
            <div className="mt-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-md text-sm">
              ⚠️ {presence.editingUser.displayName} is also editing this item
            </div>
          )}
        </DrawerHeader>

        <div className="px-4 py-2 space-y-4 overflow-y-auto">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Product name"
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Input
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Category"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Price</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
              className={cn(errors.price && 'border-destructive')}
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price}</p>
            )}
          </div>

          {/* Stock with quick adjust buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Stock</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleStockAdjust(-10)}
                disabled={formData.stock < 10}
              >
                -10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleStockAdjust(-1)}
                disabled={formData.stock < 1}
              >
                -1
              </Button>
              <Input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                className={cn('text-center', errors.stock && 'border-destructive')}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleStockAdjust(1)}
              >
                +1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleStockAdjust(10)}
              >
                +10
              </Button>
            </div>
            {errors.stock && (
              <p className="text-xs text-destructive">{errors.stock}</p>
            )}
          </div>

          {/* Barcode (read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Barcode</label>
            <Input
              value={formData.barcode}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            {onDelete && (
              <Button
                variant="destructive"
                onClick={() => onDelete(item.id)}
                disabled={isSaving}
              >
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <DrawerClose asChild>
              <Button variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </DrawerClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default InventoryEditDrawer;
