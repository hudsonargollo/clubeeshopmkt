/**
 * Product Form Component with Type Toggle
 * Requirements: 6.4, 6.5, 6.6, 10.2, 15.4, 15.5 - Product/Service form with type toggle
 * 
 * Form for creating and editing products/services with:
 * - Type toggle (Physical Product vs Service)
 * - Conditional barcode/stock fields for physical products
 * - Category dropdown
 * - Image upload with preview
 * - Mobile-friendly drawer layout
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Wrench, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '~/components/ui/drawer';
import { cn } from '~/lib/utils';

// Types
export type InventoryType = 'physical' | 'service';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ProductFormData {
  type: InventoryType;
  name: string;
  description: string;
  category_id: string;
  barcode: string;
  stock: number;
  price: number;
  image_url: string | null;
}

export interface ProductItem extends ProductFormData {
  id: string;
  tenant_id: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface ProductFormProps {
  /** Initial data for editing (null for new product) */
  initialData?: ProductItem | null;
  /** Available categories for dropdown */
  categories: Category[];
  /** Callback when form is submitted */
  onSubmit: (data: ProductFormData, imageFile?: File) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Whether form submission is in progress */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Field-specific error */
  fieldError?: { field: string; message: string } | null;
  /** Whether to use drawer layout (mobile) */
  useDrawer?: boolean;
  /** Whether drawer is open (only used when useDrawer is true) */
  open?: boolean;
  /** Callback when drawer open state changes */
  onOpenChange?: (open: boolean) => void;
}

const defaultFormData: ProductFormData = {
  type: 'physical',
  name: '',
  description: '',
  category_id: '',
  barcode: '',
  stock: 0,
  price: 0,
  image_url: null,
};

/**
 * Type Toggle Component
 */
function TypeToggle({
  value,
  onChange,
  disabled,
}: {
  value: InventoryType;
  onChange: (type: InventoryType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex rounded-lg border p-1 bg-muted/50">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('physical')}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          value === 'physical'
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Package className="h-4 w-4" />
        <span>Physical Product</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('service')}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          value === 'service'
            ? "bg-purple-100 dark:bg-purple-900/30 shadow-sm text-purple-700 dark:text-purple-300"
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Wrench className="h-4 w-4" />
        <span>Service</span>
      </button>
    </div>
  );
}

/**
 * Image Upload Component
 */
function ImageUpload({
  value,
  onChange,
  onFileSelect,
  disabled,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(value);

  React.useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      onFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Product Image</label>
      
      {preview ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
          <img
            src={preview}
            alt="Product preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background shadow-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "w-full aspect-video rounded-lg border-2 border-dashed",
            "flex flex-col items-center justify-center gap-2",
            "text-muted-foreground hover:text-foreground hover:border-foreground/50",
            "transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="h-8 w-8" />
          <span className="text-sm">Click to upload image</span>
          <span className="text-xs text-muted-foreground">PNG, JPG, WebP up to 5MB</span>
        </button>
      )}
      
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Form Field Component
 */
function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Main Form Content
 */
function ProductFormContent({
  formData,
  setFormData,
  errors,
  categories,
  isLoading,
  onFileSelect,
}: {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: Record<string, string>;
  categories: Category[];
  isLoading?: boolean;
  onFileSelect: (file: File | null) => void;
}) {
  const handleChange = <K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Type Toggle */}
      <FormField label="Item Type" required>
        <TypeToggle
          value={formData.type}
          onChange={(type) => handleChange('type', type)}
          disabled={isLoading}
        />
      </FormField>

      {/* Name */}
      <FormField label="Name" error={errors.name} required>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={formData.type === 'physical' ? "Product name" : "Service name"}
          disabled={isLoading}
          className={cn(errors.name && "border-destructive")}
        />
      </FormField>

      {/* Description */}
      <FormField label="Description" error={errors.description}>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Optional description..."
          disabled={isLoading}
          rows={3}
          className={cn(
            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
            errors.description && "border-destructive"
          )}
        />
      </FormField>

      {/* Category */}
      <FormField label="Category" error={errors.category_id}>
        <Select
          value={formData.category_id}
          onValueChange={(value) => handleChange('category_id', value)}
          disabled={isLoading}
        >
          <SelectTrigger className={cn(errors.category_id && "border-destructive")}>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No category</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {/* Price */}
      <FormField label="Price" error={errors.price} required>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
            disabled={isLoading}
            className={cn("pl-7", errors.price && "border-destructive")}
          />
        </div>
      </FormField>

      {/* Physical Product Fields */}
      <AnimatePresence mode="wait">
        {formData.type === 'physical' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Barcode */}
            <FormField label="Barcode" error={errors.barcode} required>
              <Input
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Scan or enter barcode"
                disabled={isLoading}
                className={cn(errors.barcode && "border-destructive")}
              />
            </FormField>

            {/* Stock */}
            <FormField label="Stock Quantity" error={errors.stock} required>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleChange('stock', Math.max(0, formData.stock - 10))}
                  disabled={isLoading || formData.stock < 10}
                >
                  -10
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleChange('stock', Math.max(0, formData.stock - 1))}
                  disabled={isLoading || formData.stock < 1}
                >
                  -1
                </Button>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                  disabled={isLoading}
                  className={cn("text-center flex-1", errors.stock && "border-destructive")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleChange('stock', formData.stock + 1)}
                  disabled={isLoading}
                >
                  +1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleChange('stock', formData.stock + 10)}
                  disabled={isLoading}
                >
                  +10
                </Button>
              </div>
            </FormField>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Upload */}
      <ImageUpload
        value={formData.image_url}
        onChange={(url) => handleChange('image_url', url)}
        onFileSelect={onFileSelect}
        disabled={isLoading}
      />
    </div>
  );
}


/**
 * ProductForm - Main component
 */
export function ProductForm({
  initialData,
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  fieldError,
  useDrawer = false,
  open = true,
  onOpenChange,
}: ProductFormProps) {
  const [formData, setFormData] = React.useState<ProductFormData>(() => {
    if (initialData) {
      return {
        type: initialData.type,
        name: initialData.name,
        description: initialData.description || '',
        category_id: initialData.category_id || '',
        barcode: initialData.barcode || '',
        stock: initialData.stock,
        price: initialData.price,
        image_url: initialData.image_url,
      };
    }
    return defaultFormData;
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [imageFile, setImageFile] = React.useState<File | null>(null);

  // Update errors when fieldError changes
  React.useEffect(() => {
    if (fieldError) {
      setErrors((prev) => ({ ...prev, [fieldError.field]: fieldError.message }));
    }
  }, [fieldError]);

  // Reset form when initialData changes
  React.useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type,
        name: initialData.name,
        description: initialData.description || '',
        category_id: initialData.category_id || '',
        barcode: initialData.barcode || '',
        stock: initialData.stock,
        price: initialData.price,
        image_url: initialData.image_url,
      });
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
    setImageFile(null);
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    if (formData.type === 'physical') {
      if (!formData.barcode.trim()) {
        newErrors.barcode = 'Barcode is required for physical products';
      }
      if (formData.stock < 0) {
        newErrors.stock = 'Stock cannot be negative';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    await onSubmit(formData, imageFile || undefined);
  };

  const isEditing = !!initialData;
  const title = isEditing 
    ? `Edit ${formData.type === 'service' ? 'Service' : 'Product'}` 
    : `New ${formData.type === 'service' ? 'Service' : 'Product'}`;

  const formContent = (
    <ProductFormContent
      formData={formData}
      setFormData={setFormData}
      errors={errors}
      categories={categories}
      isLoading={isLoading}
      onFileSelect={setImageFile}
    />
  );

  const formActions = (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={isLoading}
        className="flex-1"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          isEditing ? 'Save Changes' : 'Create'
        )}
      </Button>
    </div>
  );

  // Drawer layout for mobile
  if (useDrawer) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>
              {isEditing 
                ? 'Update the details below' 
                : `Add a new ${formData.type === 'service' ? 'service' : 'product'} to your catalog`}
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="px-4 py-2 overflow-y-auto flex-1">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}
              {formContent}
            </div>

            <DrawerFooter>
              {formActions}
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  // Regular form layout for desktop
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {isEditing 
            ? 'Update the details below' 
            : `Add a new ${formData.type === 'service' ? 'service' : 'product'} to your catalog`}
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-md bg-destructive/10 text-destructive text-sm"
        >
          {error}
        </motion.div>
      )}

      {formContent}

      <div className="pt-4 border-t">
        {formActions}
      </div>
    </form>
  );
}

export default ProductForm;
