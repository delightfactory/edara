import { supabase } from '@/lib/supabase/client'
import type {
    Category, CategoryInput, CategoryFilters,
    Brand, BrandInput,
    Unit, UnitInput,
    Product, ProductInput, ProductWithRefs, ProductFilters,
    ProductUnit, ProductUnitInput, ProductUnitWithRef,
    PriceList, PriceListInput,
    PriceListItem, PriceListItemInput, PriceListItemWithProduct,
} from '@/lib/types/products'

// ============================================================
// Categories
// ============================================================

export async function getCategories(filters: CategoryFilters = {}) {
    let query = supabase
        .from('categories')
        .select('*')
        .order('sort_order')
        .order('name')

    if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
    }
    if (filters.parent_id !== undefined) {
        query = filters.parent_id === null
            ? query.is('parent_id', null)
            : query.eq('parent_id', filters.parent_id)
    }
    if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Category[]
}

export async function getCategory(id: string) {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data as Category
}

export async function createCategory(input: Partial<CategoryInput>) {
    const { data, error } = await supabase
        .from('categories')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as Category
}

export async function updateCategory(id: string, updates: Partial<CategoryInput>) {
    const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Category
}

export async function deleteCategory(id: string) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================================
// Brands
// ============================================================

export async function getBrands() {
    const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name')

    if (error) throw error
    return data as Brand[]
}

export async function createBrand(input: Partial<BrandInput>) {
    const { data, error } = await supabase
        .from('brands')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as Brand
}

export async function updateBrand(id: string, updates: Partial<BrandInput>) {
    const { data, error } = await supabase
        .from('brands')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Brand
}

export async function deleteBrand(id: string) {
    const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================================
// Units
// ============================================================

export async function getUnits() {
    const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name')

    if (error) throw error
    return data as Unit[]
}

export async function createUnit(input: Partial<UnitInput>) {
    const { data, error } = await supabase
        .from('units')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as Unit
}

export async function updateUnit(id: string, updates: Partial<UnitInput>) {
    const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Unit
}

export async function deleteUnit(id: string) {
    const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================================
// Products
// ============================================================

export async function getProducts(filters: ProductFilters = {}) {
    const page = filters.page || 1
    const pageSize = filters.pageSize || 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from('products')
        .select(
            '*, category:category_id(id, name), brand:brand_id(id, name), unit:unit_id(id, name, symbol)',
            { count: 'exact' }
        )
        .order('name')
        .range(from, to)

    if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`)
    }
    if (filters.category_id) {
        query = query.eq('category_id', filters.category_id)
    }
    if (filters.brand_id) {
        query = query.eq('brand_id', filters.brand_id)
    }
    if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
    }
    if (filters.has_batches !== undefined) {
        query = query.eq('has_batches', filters.has_batches)
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
        data: data as ProductWithRefs[],
        total: count || 0,
    }
}

export async function getProduct(id: string) {
    const { data, error } = await supabase
        .from('products')
        .select('*, category:category_id(id, name), brand:brand_id(id, name), unit:unit_id(id, name, symbol)')
        .eq('id', id)
        .single()

    if (error) throw error
    return data as ProductWithRefs
}

export async function createProduct(input: Partial<ProductInput>) {
    const { data, error } = await supabase
        .from('products')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as Product
}

export async function updateProduct(id: string, updates: Partial<ProductInput>) {
    const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Product
}

export async function deleteProduct(id: string) {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================================
// Product Units (alternative units per product)
// ============================================================

export async function getProductUnits(productId: string) {
    const { data, error } = await supabase
        .from('product_units')
        .select('*, unit:unit_id(id, name, symbol)')
        .eq('product_id', productId)
        .order('conversion_factor')

    if (error) throw error
    return data as ProductUnitWithRef[]
}

export async function createProductUnit(input: ProductUnitInput) {
    const { data, error } = await supabase
        .from('product_units')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as ProductUnit
}

export async function updateProductUnit(id: string, updates: Partial<ProductUnitInput>) {
    const { data, error } = await supabase
        .from('product_units')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as ProductUnit
}

export async function deleteProductUnit(id: string) {
    const { error } = await supabase
        .from('product_units')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================================
// Price Lists
// ============================================================

export async function getPriceLists() {
    const { data, error } = await supabase
        .from('price_lists')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name')

    if (error) throw error
    return data as PriceList[]
}

export async function createPriceList(input: Partial<PriceListInput>) {
    const { data, error } = await supabase
        .from('price_lists')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as PriceList
}

export async function updatePriceList(id: string, updates: Partial<PriceListInput>) {
    const { data, error } = await supabase
        .from('price_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as PriceList
}

export async function deletePriceList(id: string) {
    const { error } = await supabase
        .from('price_lists')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================================
// Price List Items
// ============================================================

export async function getPriceListItems(priceListId: string) {
    const { data, error } = await supabase
        .from('price_list_items')
        .select('*, product:product_id(id, name, sku)')
        .eq('price_list_id', priceListId)
        .order('created_at')

    if (error) throw error
    return data as PriceListItemWithProduct[]
}

export async function upsertPriceListItem(input: PriceListItemInput) {
    const { data, error } = await supabase
        .from('price_list_items')
        .upsert(input, { onConflict: 'price_list_id,product_id,min_qty' })
        .select()
        .single()

    if (error) throw error
    return data as PriceListItem
}

export async function deletePriceListItem(id: string) {
    const { error } = await supabase
        .from('price_list_items')
        .delete()
        .eq('id', id)

    if (error) throw error
}
