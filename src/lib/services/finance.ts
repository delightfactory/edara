// ============================================================
// EDARA — Finance Module Services
// Supabase CRUD + RPC for: vaults, vault_transactions,
//   custody_accounts, custody_transactions, chart_of_accounts,
//   fiscal_periods, journal_entries, expense_categories, expenses,
//   customer_payments, supplier_payments, approval_rules
// ============================================================

import { supabase } from '@/lib/supabase/client'
import type {
    VaultWithRefs, VaultInput, VaultFilters,
    VaultTransactionWithRefs, VaultTransactionFilters,
    CustodyAccountWithRefs, CustodyFilters,
    CustodyTransactionWithRefs, CustodyTransactionFilters,
    ChartOfAccount,
    FiscalPeriod,
    JournalEntryWithLines, JournalEntryFilters,
    ExpenseCategory, ExpenseCategoryInput,
    ExpenseWithRefs, ExpenseInput, ExpenseFilters,
    CustomerPaymentWithRefs, CustomerPaymentInput, CustomerPaymentFilters,
    SupplierPaymentWithRefs, SupplierPaymentInput, SupplierPaymentFilters,
    ApprovalRuleWithRefs, ApprovalRuleInput,
} from '@/lib/types/finance'

// ── Vaults ───────────────────────────────────────────────────

export async function getVaults(filters: VaultFilters = {}): Promise<{ data: VaultWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, type, is_active, branch_id } = filters

    let query = supabase
        .from('vaults')
        .select(`
            *,
            responsible:profiles!responsible_id ( full_name ),
            branch:branches!branch_id ( name )
        `, { count: 'exact' })

    if (type) query = query.eq('type', type)
    if (is_active !== undefined) query = query.eq('is_active', is_active)
    if (branch_id) query = query.eq('branch_id', branch_id)
    if (search) query = query.ilike('name', `%${search}%`)

    query = query
        .order('name')
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error
    return { data: (data || []) as VaultWithRefs[], total: count || 0 }
}

export async function getVault(id: string): Promise<VaultWithRefs | null> {
    const { data, error } = await supabase
        .from('vaults')
        .select(`
            *,
            responsible:profiles!responsible_id ( full_name ),
            branch:branches!branch_id ( name )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as VaultWithRefs
}

export async function createVault(input: Partial<VaultInput>): Promise<VaultWithRefs> {
    const { data, error } = await supabase
        .from('vaults')
        .insert(input)
        .select(`
            *,
            responsible:profiles!responsible_id ( full_name ),
            branch:branches!branch_id ( name )
        `)
        .single()

    if (error) throw error
    return data as VaultWithRefs
}

export async function updateVault(id: string, input: Partial<VaultInput>): Promise<VaultWithRefs> {
    const { data, error } = await supabase
        .from('vaults')
        .update(input)
        .eq('id', id)
        .select(`
            *,
            responsible:profiles!responsible_id ( full_name ),
            branch:branches!branch_id ( name )
        `)
        .single()

    if (error) throw error
    return data as VaultWithRefs
}

export async function deleteVault(id: string): Promise<void> {
    const { error } = await supabase.from('vaults').delete().eq('id', id)
    if (error) throw error
}

export async function getActiveVaults(): Promise<{ id: string; name: string; type: string }[]> {
    const { data, error } = await supabase
        .from('vaults')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name')

    if (error) throw error
    return (data || []) as { id: string; name: string; type: string }[]
}

// ── RPC: Transfer Between Vaults ─────────────────────────────

export async function transferBetweenVaults(fromId: string, toId: string, amount: number, userId: string): Promise<void> {
    const { error } = await supabase.rpc('transfer_between_vaults', {
        p_from: fromId,
        p_to: toId,
        p_amount: amount,
        p_user_id: userId,
    })

    if (error) throw error
}

// ── RPC: Vault Deposit ───────────────────────────────────────

export async function vaultDeposit(vaultId: string, amount: number, description: string, userId: string): Promise<{ new_balance: number }> {
    const { data, error } = await supabase.rpc('vault_deposit', {
        p_vault_id: vaultId,
        p_amount: amount,
        p_description: description || null,
        p_user_id: userId,
    })

    if (error) throw error
    return data as { new_balance: number }
}

// ── RPC: Vault Withdraw ──────────────────────────────────────

export async function vaultWithdraw(vaultId: string, amount: number, description: string, userId: string): Promise<{ new_balance: number }> {
    const { data, error } = await supabase.rpc('vault_withdraw', {
        p_vault_id: vaultId,
        p_amount: amount,
        p_description: description || null,
        p_user_id: userId,
    })

    if (error) throw error
    return data as { new_balance: number }
}

// ── Vault Transactions ───────────────────────────────────────

export async function getVaultTransactions(filters: VaultTransactionFilters = {}): Promise<{ data: VaultTransactionWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, vault_id, type, date_from, date_to } = filters

    let query = supabase
        .from('vault_transactions')
        .select(`
            *,
            vault:vaults!vault_id ( name ),
            creator:profiles!created_by ( full_name )
        `, { count: 'exact' })

    if (vault_id) query = query.eq('vault_id', vault_id)
    if (type) query = query.eq('type', type)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to + 'T23:59:59')

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error
    return { data: (data || []) as VaultTransactionWithRefs[], total: count || 0 }
}

// ── Custody Accounts ─────────────────────────────────────────

export async function getCustodyAccounts(filters: CustodyFilters = {}): Promise<{ data: CustodyAccountWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, is_active } = filters

    let query = supabase
        .from('custody_accounts')
        .select(`
            *,
            employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) )
        `, { count: 'exact' })

    if (is_active !== undefined) query = query.eq('is_active', is_active)
    // search through employee name via nested filter
    // Note: Supabase doesn't support filtering on nested relations easily,
    // so we fetch all and filter client-side for search
    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error

    let result = (data || []) as CustodyAccountWithRefs[]
    if (search) {
        const s = search.toLowerCase()
        result = result.filter(c =>
            c.employee?.profile?.full_name?.toLowerCase().includes(s)
        )
    }

    return { data: result, total: count || 0 }
}

export async function getCustodyAccount(id: string): Promise<CustodyAccountWithRefs | null> {
    const { data, error } = await supabase
        .from('custody_accounts')
        .select(`
            *,
            employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as CustodyAccountWithRefs
}

export async function getActiveCustodyAccounts(): Promise<{ id: string; employee: any; current_balance: number }[]> {
    const { data, error } = await supabase
        .from('custody_accounts')
        .select('id, current_balance, employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) )')
        .eq('is_active', true)
        .order('created_at')

    if (error) throw error
    return (data || []) as { id: string; employee: any; current_balance: number }[]
}

// ── RPC: Settle Custody ──────────────────────────────────────

export async function settleCustody(custodyId: string, vaultId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('settle_custody', {
        p_custody_id: custodyId,
        p_vault_id: vaultId,
        p_user_id: userId,
    })

    if (error) throw error
}

// ── Create Custody Account ───────────────────────────────────

export async function createCustodyAccount(employeeId: string, maxBalance: number): Promise<CustodyAccountWithRefs> {
    const { data, error } = await supabase
        .from('custody_accounts')
        .insert({ employee_id: employeeId, max_balance: maxBalance })
        .select(`
            *,
            employee:employees!employee_id ( id, profile:profiles!profile_id ( full_name ) )
        `)
        .single()

    if (error) throw error
    return data as CustodyAccountWithRefs
}

// ── RPC: Load Custody Balance ────────────────────────────────

export async function loadCustodyBalance(custodyId: string, vaultId: string, amount: number, description: string, userId: string): Promise<{ new_custody_balance: number; new_vault_balance: number }> {
    const { data, error } = await supabase.rpc('custody_load_balance', {
        p_custody_id: custodyId,
        p_vault_id: vaultId,
        p_amount: amount,
        p_description: description || null,
        p_user_id: userId,
    })

    if (error) throw error
    return data as { new_custody_balance: number; new_vault_balance: number }
}

// ── Custody Transactions ─────────────────────────────────────

export async function getCustodyTransactions(filters: CustodyTransactionFilters = {}): Promise<{ data: CustodyTransactionWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, custody_id, type, date_from, date_to } = filters

    let query = supabase
        .from('custody_transactions')
        .select(`
            *,
            custody:custody_accounts!custody_id ( employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) ) ),
            creator:profiles!created_by ( full_name )
        `, { count: 'exact' })

    if (custody_id) query = query.eq('custody_id', custody_id)
    if (type) query = query.eq('type', type)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to + 'T23:59:59')

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error
    return { data: (data || []) as CustodyTransactionWithRefs[], total: count || 0 }
}

// ── Chart of Accounts ────────────────────────────────────────

export async function getChartOfAccounts(): Promise<ChartOfAccount[]> {
    const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code')

    if (error) throw error
    return (data || []) as ChartOfAccount[]
}

// ── Fiscal Periods ───────────────────────────────────────────

export async function getFiscalPeriods(): Promise<FiscalPeriod[]> {
    const { data, error } = await supabase
        .from('fiscal_periods')
        .select('*')
        .order('start_date', { ascending: false })

    if (error) throw error
    return (data || []) as FiscalPeriod[]
}

export async function createFiscalPeriod(input: { name: string; start_date: string; end_date: string }): Promise<FiscalPeriod> {
    const { data, error } = await supabase
        .from('fiscal_periods')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as FiscalPeriod
}

export async function closeFiscalPeriod(id: string): Promise<void> {
    const { error } = await supabase
        .from('fiscal_periods')
        .update({ status: 'closed' })
        .eq('id', id)

    if (error) throw error
}

// ── Journal Entries ──────────────────────────────────────────

export async function getJournalEntries(filters: JournalEntryFilters = {}): Promise<{ data: JournalEntryWithLines[]; total: number }> {
    const { page = 1, pageSize = 25, search, source_type, date_from, date_to, status } = filters

    let query = supabase
        .from('journal_entries')
        .select(`
            *,
            creator:profiles!created_by ( full_name )
        `, { count: 'exact' })

    if (source_type) query = query.eq('source_type', source_type)
    if (status) query = query.eq('status', status)
    if (date_from) query = query.gte('date', date_from)
    if (date_to) query = query.lte('date', date_to)
    if (search) query = query.or(`entry_number.ilike.%${search}%,description.ilike.%${search}%`)

    query = query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error
    return { data: (data || []) as JournalEntryWithLines[], total: count || 0 }
}

export async function getJournalEntry(id: string): Promise<JournalEntryWithLines | null> {
    const { data, error } = await supabase
        .from('journal_entries')
        .select(`
            *,
            creator:profiles!created_by ( full_name ),
            lines:journal_entry_lines (
                *,
                account:chart_of_accounts!account_id ( code, name )
            )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as JournalEntryWithLines
}

// ── Expense Categories ───────────────────────────────────────

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name')

    if (error) throw error
    return (data || []) as ExpenseCategory[]
}

export async function createExpenseCategory(input: ExpenseCategoryInput): Promise<ExpenseCategory> {
    const { data, error } = await supabase
        .from('expense_categories')
        .insert(input)
        .select()
        .single()

    if (error) throw error
    return data as ExpenseCategory
}

export async function updateExpenseCategory(id: string, input: Partial<ExpenseCategoryInput>): Promise<ExpenseCategory> {
    const { data, error } = await supabase
        .from('expense_categories')
        .update(input)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as ExpenseCategory
}

export async function deleteExpenseCategory(id: string): Promise<void> {
    const { error } = await supabase.from('expense_categories').delete().eq('id', id)
    if (error) throw error
}

// ── Expenses ─────────────────────────────────────────────────

export async function getExpenses(filters: ExpenseFilters = {}): Promise<{ data: ExpenseWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, status, category_id, vault_id, branch_id, date_from, date_to } = filters

    let query = supabase
        .from('expenses')
        .select(`
            *,
            category:expense_categories!category_id ( name ),
            vault:vaults!vault_id ( name ),
            custody:custody_accounts!custody_id ( employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) ) ),
            requester:profiles!requested_by ( full_name ),
            approver:profiles!approved_by ( full_name ),
            branch:branches!branch_id ( name )
        `, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (category_id) query = query.eq('category_id', category_id)
    if (vault_id) query = query.eq('vault_id', vault_id)
    if (branch_id) query = query.eq('branch_id', branch_id)
    if (date_from) query = query.gte('expense_date', date_from)
    if (date_to) query = query.lte('expense_date', date_to)
    if (search) query = query.or(`expense_number.ilike.%${search}%,description.ilike.%${search}%`)

    query = query
        .order('expense_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error
    return { data: (data || []) as ExpenseWithRefs[], total: count || 0 }
}

export async function getExpense(id: string): Promise<ExpenseWithRefs | null> {
    const { data, error } = await supabase
        .from('expenses')
        .select(`
            *,
            category:expense_categories!category_id ( name ),
            vault:vaults!vault_id ( name ),
            custody:custody_accounts!custody_id ( employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) ) ),
            requester:profiles!requested_by ( full_name ),
            approver:profiles!approved_by ( full_name ),
            branch:branches!branch_id ( name )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as ExpenseWithRefs
}

export async function createExpense(input: ExpenseInput, userId: string): Promise<ExpenseWithRefs> {
    // Generate expense number via RPC
    const { data: expNum, error: numError } = await supabase.rpc('generate_order_number', { p_type: 'EXP' })
    if (numError) throw numError

    const { data, error } = await supabase
        .from('expenses')
        .insert({
            ...input,
            expense_number: expNum as string,
            requested_by: userId,
            status: 'draft',
        })
        .select(`
            *,
            category:expense_categories!category_id ( name ),
            vault:vaults!vault_id ( name ),
            branch:branches!branch_id ( name )
        `)
        .single()

    if (error) throw error
    return data as ExpenseWithRefs
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<ExpenseWithRefs> {
    const { data, error } = await supabase
        .from('expenses')
        .update(input)
        .eq('id', id)
        .select(`
            *,
            category:expense_categories!category_id ( name ),
            vault:vaults!vault_id ( name ),
            branch:branches!branch_id ( name )
        `)
        .single()

    if (error) throw error
    return data as ExpenseWithRefs
}

export async function deleteExpense(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
}

// ── RPC: Approve Expense ─────────────────────────────────────

export async function approveExpense(expenseId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('approve_expense', {
        p_expense_id: expenseId,
        p_user_id: userId,
    })

    if (error) throw error
}

// ── Reject Expense ───────────────────────────────────────────

export async function rejectExpense(expenseId: string, userId: string, reason: string): Promise<void> {
    const { error } = await supabase
        .from('expenses')
        .update({
            status: 'rejected',
            approved_by: userId,
            approved_at: new Date().toISOString(),
            rejection_reason: reason,
            updated_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .in('status', ['draft', 'pending_approval'])

    if (error) throw error
}

// ── Customer Payments ────────────────────────────────────────

export async function getCustomerPayments(filters: CustomerPaymentFilters = {}): Promise<{ data: CustomerPaymentWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, status, customer_id, payment_method, date_from, date_to } = filters

    let query = supabase
        .from('customer_payments')
        .select(`
            *,
            customer:customers!customer_id ( name, code ),
            vault:vaults!vault_id ( name ),
            custody:custody_accounts!custody_id ( employee:employees!employee_id ( profile:profiles!profile_id ( full_name ) ) ),
            collector:profiles!collected_by ( full_name )
        `, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (customer_id) query = query.eq('customer_id', customer_id)
    if (payment_method) query = query.eq('payment_method', payment_method)
    if (date_from) query = query.gte('payment_date', date_from)
    if (date_to) query = query.lte('payment_date', date_to)
    if (search) query = query.or(`payment_number.ilike.%${search}%`)

    query = query
        .order('payment_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error
    return { data: (data || []) as CustomerPaymentWithRefs[], total: count || 0 }
}

// ── RPC: Record / Confirm / Cancel Customer Payment ──────────

export async function recordCustomerPayment(input: CustomerPaymentInput, userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('record_customer_payment', {
        p_customer_id: input.customer_id,
        p_amount: input.amount,
        p_method: input.payment_method,
        p_vault_id: input.vault_id,
        p_custody_id: input.custody_id,
        p_user_id: userId,
        p_notes: input.notes || null,
        p_proof_id: input.proof_id || null,
    })

    if (error) throw error
    return data as string
}

export async function confirmCustomerPayment(paymentId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('confirm_customer_payment', {
        p_payment_id: paymentId,
        p_user_id: userId,
    })

    if (error) throw error
}

export async function cancelCustomerPayment(paymentId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_customer_payment', {
        p_payment_id: paymentId,
        p_user_id: userId,
    })

    if (error) throw error
}

// ── Supplier Payments ────────────────────────────────────────

export async function getSupplierPayments(filters: SupplierPaymentFilters = {}): Promise<{ data: SupplierPaymentWithRefs[]; total: number }> {
    const { page = 1, pageSize = 25, search, status, supplier_id, payment_method, date_from, date_to } = filters

    let query = supabase
        .from('supplier_payments')
        .select(`
            *,
            supplier:suppliers!supplier_id ( name, code ),
            vault:vaults!vault_id ( name ),
            creator:profiles!created_by ( full_name )
        `, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (supplier_id) query = query.eq('supplier_id', supplier_id)
    if (payment_method) query = query.eq('payment_method', payment_method)
    if (date_from) query = query.gte('payment_date', date_from)
    if (date_to) query = query.lte('payment_date', date_to)
    if (search) query = query.or(`payment_number.ilike.%${search}%`)

    query = query
        .order('payment_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error
    return { data: (data || []) as SupplierPaymentWithRefs[], total: count || 0 }
}

// ── RPC: Record / Confirm / Cancel Supplier Payment ──────────

export async function recordSupplierPayment(input: SupplierPaymentInput, userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('record_supplier_payment', {
        p_supplier_id: input.supplier_id,
        p_amount: input.amount,
        p_method: input.payment_method,
        p_vault_id: input.vault_id,
        p_user_id: userId,
        p_notes: input.notes || null,
    })

    if (error) throw error
    return data as string
}

export async function confirmSupplierPayment(paymentId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('confirm_supplier_payment', {
        p_payment_id: paymentId,
        p_user_id: userId,
    })

    if (error) throw error
}

export async function cancelSupplierPayment(paymentId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_supplier_payment', {
        p_payment_id: paymentId,
        p_user_id: userId,
    })

    if (error) throw error
}

// ── Approval Rules ───────────────────────────────────────────

export async function getApprovalRules(): Promise<{ data: ApprovalRuleWithRefs[]; total: number }> {
    const { data, error, count } = await supabase
        .from('approval_rules')
        .select(`
            *,
            role:roles!role_id ( name ),
            user:profiles!user_id ( full_name )
        `, { count: 'exact' })
        .order('type')
        .order('max_amount')

    if (error) throw error
    return { data: (data || []) as ApprovalRuleWithRefs[], total: count || 0 }
}

export async function createApprovalRule(input: ApprovalRuleInput): Promise<ApprovalRuleWithRefs> {
    const { data, error } = await supabase
        .from('approval_rules')
        .insert(input)
        .select(`
            *,
            role:roles!role_id ( name ),
            user:profiles!user_id ( full_name )
        `)
        .single()

    if (error) throw error
    return data as ApprovalRuleWithRefs
}

export async function updateApprovalRule(id: string, input: Partial<ApprovalRuleInput>): Promise<ApprovalRuleWithRefs> {
    const { data, error } = await supabase
        .from('approval_rules')
        .update(input)
        .eq('id', id)
        .select(`
            *,
            role:roles!role_id ( name ),
            user:profiles!user_id ( full_name )
        `)
        .single()

    if (error) throw error
    return data as ApprovalRuleWithRefs
}

export async function deleteApprovalRule(id: string): Promise<void> {
    const { error } = await supabase.from('approval_rules').delete().eq('id', id)
    if (error) throw error
}
