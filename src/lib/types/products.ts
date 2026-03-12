/**
 * Products Module — Type Definitions
 * Matches Phase 02 migration schema exactly
 */

// ============================================================
// ENUMs (matching database)
// ============================================================

export type WarehouseType = 'main' | 'branch' | 'van' | 'scrap'

export type MovementType =
    | 'purchase_in'
    | 'sales_out'
    | 'transfer_in'
    | 'transfer_out'
    | 'adjustment'
    | 'return_in'
    | 'return_out'
    | 'scrap'
    | 'initial'

export type CustomerType = 'retail' | 'wholesale' | 'service_center' | 'car_wash' | 'distributor' | 'other'

export type CustomerClassification = 'A' | 'B' | 'C' | 'D'

export type PaymentTermsType = 'cash' | 'credit_7' | 'credit_15' | 'credit_30' | 'credit_45' | 'credit_60' | 'credit_90'

export type RepType = 'van_sales' | 'pre_sales' | 'delivery_driver'

export type DeliveryMethod = 'direct' | 'company_van' | 'shipping_company'

// ============================================================
// Categories
// ============================================================

export interface Category {
    id: string
    name: string
    parent_id: string | null
    image_url: string | null
    sort_order: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export type CategoryInput = Omit<Category, 'id' | 'created_at' | 'updated_at'>

// ============================================================
// Brands
// ============================================================

export interface Brand {
    id: string
    name: string
    logo_url: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export type BrandInput = Omit<Brand, 'id' | 'created_at' | 'updated_at'>

// ============================================================
// Units
// ============================================================

export interface Unit {
    id: string
    name: string
    symbol: string
    base_unit_id: string | null
    conversion_factor: number
    created_at: string
}

export type UnitInput = Omit<Unit, 'id' | 'created_at'>

// ============================================================
// Products
// ============================================================

export interface Product {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    category_id: string | null
    brand_id: string | null
    unit_id: string | null
    description: string | null
    image_url: string | null
    cost_price: number
    selling_price: number
    min_stock: number
    max_stock: number
    has_batches: boolean
    requires_expiry: boolean
    is_taxable: boolean
    tax_percentage: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>

/** Product with joined references for display */
export interface ProductWithRefs extends Product {
    category?: Pick<Category, 'id' | 'name'> | null
    brand?: Pick<Brand, 'id' | 'name'> | null
    unit?: Pick<Unit, 'id' | 'name' | 'symbol'> | null
}

// ============================================================
// Product Units (alternative units per product)
// ============================================================

export interface ProductUnit {
    id: string
    product_id: string
    unit_id: string
    conversion_factor: number
    barcode: string | null
    selling_price: number | null
    created_at: string
}

export type ProductUnitInput = Omit<ProductUnit, 'id' | 'created_at'>

export interface ProductUnitWithRef extends ProductUnit {
    unit?: Pick<Unit, 'id' | 'name' | 'symbol'> | null
}

// ============================================================
// Price Lists
// ============================================================

export interface PriceList {
    id: string
    name: string
    is_default: boolean
    is_active: boolean
    created_at: string
    updated_at: string
}

export type PriceListInput = Omit<PriceList, 'id' | 'created_at' | 'updated_at'>

// ============================================================
// Price List Items
// ============================================================

export interface PriceListItem {
    id: string
    price_list_id: string
    product_id: string
    price: number
    min_qty: number
    created_at: string
    updated_at: string
}

export type PriceListItemInput = Omit<PriceListItem, 'id' | 'created_at' | 'updated_at'>

export interface PriceListItemWithProduct extends PriceListItem {
    product?: Pick<Product, 'id' | 'name' | 'sku'> | null
}

// ============================================================
// Filters
// ============================================================

export interface ProductFilters {
    search?: string
    category_id?: string
    brand_id?: string
    is_active?: boolean
    has_batches?: boolean
    page?: number
    pageSize?: number
}

export interface CategoryFilters {
    search?: string
    parent_id?: string | null
    is_active?: boolean
}
