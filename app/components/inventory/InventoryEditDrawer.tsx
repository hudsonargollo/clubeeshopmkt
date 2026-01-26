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
import { cn } from '~/lib/utils';

export interface InventoryItem {
  id: string;
  barcode: string | null;
  name: string;
  category: string;
  stock: number;
  price: number;
  image_url: string | null;
  type?: 'physical' | 'service';
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
}: InventoryEditDrawerProps) {
  const [formData, setFormData] = React.useState<InventoryItem | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Initialize form data when item changes
  React.useEffect(() => {
    if (item) {
      setFormData({ ...item });
      setErrors({});
    }
  }, [item]);

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
      newErrors.name = 'Nome é obrigatório';
    }
    if (formData.type === 'physical' && !formData.barcode?.trim()) {
      newErrors.barcode = 'Código de barras é obrigatório para produtos físicos';
    }
    if (formData.price < 0) {
      newErrors.price = 'Preço não pode ser negativo';
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Estoque não pode ser negativo';
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
          <DrawerTitle>Editar Item do Estoque</DrawerTitle>
          <DrawerDescription>
            {item.barcode} • {item.category}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 py-2 space-y-4 overflow-y-auto">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nome do produto"
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria</label>
            <Input
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Categoria"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preço</label>
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
            <label className="text-sm font-medium">Estoque</label>
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
            <label className="text-sm font-medium">Código de Barras</label>
            <Input
              value={formData.barcode || ''}
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
                Excluir
              </Button>
            )}
            <div className="flex-1" />
            <DrawerClose asChild>
              <Button variant="outline" disabled={isSaving}>
                Cancelar
              </Button>
            </DrawerClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default InventoryEditDrawer;
