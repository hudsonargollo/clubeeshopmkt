/**
 * Order List Component
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 15.6, 15.7 - Order list with tabs and filters
 * 
 * Displays orders in a table with tabs for Active/Completed/Cancelled
 * and filters for status and date range
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '~/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import type { Order } from '~/lib/orderUtils';
import { formatCurrency, formatDateTime } from '~/lib/orderUtils';
import { STATUS_LABELS, STATUS_COLORS, type OrderStatus } from '~/lib/orderStateMachine';
import { cn } from '~/lib/utils';
import { 
  ShoppingBag, 
  Truck, 
  Calendar, 
  Filter, 
  X,
  ChevronRight,
  Package
} from 'lucide-react';

export type OrderTab = 'active' | 'completed' | 'cancelled';

export interface OrderListFilters {
  tab: OrderTab;
  dateFrom?: string;
  dateTo?: string;
  status?: OrderStatus;
}

export interface OrderListProps {
  orders: Order[];
  filters: OrderListFilters;
  onFilterChange: (filters: OrderListFilters) => void;
  onOrderSelect: (orderId: string) => void;
  isLoading?: boolean;
}

// Map tabs to their included statuses
const TAB_STATUSES: Record<OrderTab, OrderStatus[]> = {
  active: ['pending', 'paid', 'processing', 'ready'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

// Status badge colors
function getStatusBadgeClass(status: OrderStatus): string {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const color = STATUS_COLORS[status] || 'gray';
  return colorMap[color] || colorMap.gray;
}

// Order type icon
function OrderTypeIcon({ type }: { type: 'takeout' | 'delivery' }) {
  if (type === 'delivery') {
    return <Truck className="h-4 w-4 text-blue-500" />;
  }
  return <ShoppingBag className="h-4 w-4 text-green-500" />;
}

export function OrderList({
  orders,
  filters,
  onFilterChange,
  onOrderSelect,
  isLoading = false,
}: OrderListProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  // Filter orders based on current tab and filters
  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      const tabStatuses = TAB_STATUSES[filters.tab];
      if (!tabStatuses.includes(order.status)) return false;

      // Status filter (within tab)
      if (filters.status && order.status !== filters.status) return false;

      // Date range filter
      if (filters.dateFrom) {
        const orderDate = new Date(order.created_at);
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (orderDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const orderDate = new Date(order.created_at);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }

      return true;
    });
  }, [orders, filters]);

  // Count orders per tab
  const tabCounts = React.useMemo(() => {
    return {
      active: orders.filter(o => TAB_STATUSES.active.includes(o.status)).length,
      completed: orders.filter(o => TAB_STATUSES.completed.includes(o.status)).length,
      cancelled: orders.filter(o => TAB_STATUSES.cancelled.includes(o.status)).length,
    };
  }, [orders]);

  // Available statuses for current tab
  const availableStatuses = TAB_STATUSES[filters.tab];

  const handleTabChange = (tab: string) => {
    onFilterChange({
      ...filters,
      tab: tab as OrderTab,
      status: undefined, // Reset status filter when changing tabs
    });
  };

  const handleStatusChange = (status: string) => {
    onFilterChange({
      ...filters,
      status: status === '' ? undefined : (status as OrderStatus),
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      dateFrom: e.target.value || undefined,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      dateTo: e.target.value || undefined,
    });
  };

  const clearFilters = () => {
    onFilterChange({
      tab: filters.tab,
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
    });
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.status;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={filters.tab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="active">
              Active
              {tabCounts.active > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                  {tabCounts.active}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              {tabCounts.completed > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {tabCounts.completed}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled
              {tabCounts.cancelled > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {tabCounts.cancelled}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Filter toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasActiveFilters && "border-primary text-primary")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
                {[filters.dateFrom, filters.dateTo, filters.status].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-end gap-4 pt-4 pb-2 border-b">
                {/* Status filter */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Select value={filters.status || ''} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date from */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">From</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={handleDateFromChange}
                      className="pl-9 w-[160px]"
                    />
                  </div>
                </div>

                {/* Date to */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">To</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={handleDateToChange}
                      className="pl-9 w-[160px]"
                    />
                  </div>
                </div>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab content - shared table */}
        <TabsContent value={filters.tab} className="mt-4">
          <OrderTable
            orders={filteredOrders}
            onOrderSelect={onOrderSelect}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Separate table component for cleaner code
interface OrderTableProps {
  orders: Order[];
  onOrderSelect: (orderId: string) => void;
  isLoading?: boolean;
}

function OrderTable({ orders, onOrderSelect, isLoading }: OrderTableProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-12 text-center"
      >
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">No orders found</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try adjusting your filters or check back later
        </p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {orders.map((order, index) => (
              <motion.tr
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
                className="border-b transition-colors hover:bg-muted/50 cursor-pointer group"
                onClick={() => onOrderSelect(order.id)}
              >
                <TableCell className="font-mono text-sm">
                  #{order.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  {getCustomerName(order) || (
                    <span className="text-muted-foreground">Walk-in</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(order.total)}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      getStatusBadgeClass(order.status)
                    )}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <OrderTypeIcon type={order.type} />
                    <span className="capitalize text-sm">{order.type}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDateTime(order.created_at)}
                </TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}

// Helper to extract customer name from fulfillment data
function getCustomerName(order: Order): string | null {
  if (order.type === 'delivery' && order.fulfillment_data) {
    const data = order.fulfillment_data as { customer_name?: string };
    return data.customer_name || null;
  }
  return null;
}

export default OrderList;
