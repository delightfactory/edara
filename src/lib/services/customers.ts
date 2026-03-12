// ============================================================
// EDARA — CRM Module Services
// Supabase CRUD for: customers, customer_contacts, customer_addresses
// ============================================================

import { supabase } from '@/lib/supabase/client'
import type {
    CustomerWithRefs, CustomerInput, CustomerFilters,
    CustomerContact, CustomerContactInput,
    CustomerAddress, CustomerAddressInput,
} from '@/lib/types/customers'

// ── Customers ────────────────────────────────────────────────

export async function getCustomers(filters: CustomerFilters = {}): Promise<{ data: CustomerWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, customer_type, classification, assigned_rep_id } = filters

    let query = supabase
        .from('customers')
        .select(`
            *,
            price_list:price_lists!price_list_id ( name ),
            assigned_rep:profiles!assigned_rep_id ( full_name )
        `, { count: 'exact' })

    if (customer_type) query = query.eq('customer_type', customer_type)
    if (classification) query = query.eq('classification', classification)
    if (assigned_rep_id) query = query.eq('assigned_rep_id', assigned_rep_id)
    if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,phone.ilike.%${search}%`)

    query = query
        .order('name')
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error

    return { data: (data || []) as CustomerWithRefs[], total: count || 0 }
}

export async function getCustomer(id: string): Promise<CustomerWithRefs | null> {
    const { data, error } = await supabase
        .from('customers')
        .select(`
            *,
            price_list:price_lists!price_list_id ( name ),
            assigned_rep:profiles!assigned_rep_id ( full_name )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as CustomerWithRefs
}

export async function createCustomer(input: Partial<CustomerInput>): Promise<CustomerWithRefs> {
    const { data, error } = await supabase
        .from('customers')
        .insert(input)
        .select(`
            *,
            price_list:price_lists!price_list_id ( name ),
            assigned_rep:profiles!assigned_rep_id ( full_name )
        `)
        .single()

    if (error) throw error
    return data as CustomerWithRefs
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<CustomerWithRefs> {
    const { data, error } = await supabase
        .from('customers')
        .update(input)
        .eq('id', id)
        .select(`
            *,
            price_list:price_lists!price_list_id ( name ),
            assigned_rep:profiles!assigned_rep_id ( full_name )
        `)
        .single()

    if (error) throw error
    return data as CustomerWithRefs
}

export async function deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ── Customer Contacts ────────────────────────────────────────

export async function getCustomerContacts(customerId: string): Promise<CustomerContact[]> {
    const { data, error } = await supabase
        .from('customer_contacts')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_primary', { ascending: false })
        .order('name')

    if (error) throw error
    return (data || []) as CustomerContact[]
}

export async function createCustomerContact(input: CustomerContactInput): Promise<CustomerContact> {
    const { data, error } = await supabase
        .from('customer_contacts')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as CustomerContact
}

export async function updateCustomerContact(id: string, input: Partial<CustomerContactInput>): Promise<CustomerContact> {
    const { data, error } = await supabase
        .from('customer_contacts')
        .update(input)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as CustomerContact
}

export async function deleteCustomerContact(id: string): Promise<void> {
    const { error } = await supabase
        .from('customer_contacts')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ── Customer Addresses ───────────────────────────────────────

export async function getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
    const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })
        .order('label')

    if (error) throw error
    return (data || []) as CustomerAddress[]
}

export async function createCustomerAddress(input: CustomerAddressInput): Promise<CustomerAddress> {
    const { data, error } = await supabase
        .from('customer_addresses')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as CustomerAddress
}

export async function updateCustomerAddress(id: string, input: Partial<CustomerAddressInput>): Promise<CustomerAddress> {
    const { data, error } = await supabase
        .from('customer_addresses')
        .update(input)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as CustomerAddress
}

export async function deleteCustomerAddress(id: string): Promise<void> {
    const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id)

    if (error) throw error
}
