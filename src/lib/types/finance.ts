// ============================================================
// EDARA — Finance Module Types
// Mirrors: vaults, vault_transactions, custody_accounts,
//          custody_transactions, chart_of_accounts, fiscal_periods,
//          journal_entries, journal_entry_lines, expense_categories,
//          expenses, customer_payments, supplier_payments, approval_rules
// ============================================================

// ── ENUMs ────────────────────────────────────────────────────

export type VaultType = 'cash' | 'bank' | 'mobile_wallet'

export type VaultTransactionType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'collection' | 'payment' | 'expense'

export type CustodyTransactionType = 'load' | 'collection' | 'expense' | 'settlement' | 'return'

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export type JournalStatus = 'draft' | 'posted'

export type PaymentMethodType = 'cash' | 'bank_transfer' | 'instapay' | 'check'

export type PaymentStatus = 'pending' | 'confirmed' | 'cancelled'

export type ExpenseStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid'

export type ApprovalType = 'expense' | 'purchase_order' | 'discount_override'

export type FiscalPeriodStatus = 'open' | 'closed'

// ── Labels ───────────────────────────────────────────────────

export const VAULT_TYPE_LABELS: Record<VaultType, string> = {
    cash: 'خزنة نقدية',
    bank: 'حساب بنكي',
    mobile_wallet: 'محفظة إلكترونية',
}

export const VAULT_TRANSACTION_TYPE_LABELS: Record<VaultTransactionType, string> = {
    deposit: 'إيداع',
    withdrawal: 'سحب',
    transfer_in: 'تحويل وارد',
    transfer_out: 'تحويل صادر',
    collection: 'تحصيل',
    payment: 'سداد',
    expense: 'مصروف',
}

export const CUSTODY_TRANSACTION_TYPE_LABELS: Record<CustodyTransactionType, string> = {
    load: 'تحميل',
    collection: 'تحصيل',
    expense: 'مصروف',
    settlement: 'تسوية',
    return: 'إرجاع',
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
    asset: 'أصول',
    liability: 'التزامات',
    equity: 'حقوق ملكية',
    revenue: 'إيرادات',
    expense: 'مصروفات',
}

export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
    draft: 'مسودة',
    posted: 'مرحّل',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
    cash: 'نقدي',
    bank_transfer: 'تحويل بنكي',
    instapay: 'إنستاباي',
    check: 'شيك',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: 'معلق',
    confirmed: 'مؤكد',
    cancelled: 'ملغى',
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
    pending: 'badge-warning',
    confirmed: 'badge-success',
    cancelled: 'badge-danger',
}

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
    draft: 'مسودة',
    pending_approval: 'في انتظار الاعتماد',
    approved: 'معتمد',
    rejected: 'مرفوض',
    paid: 'مدفوع',
}

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
    draft: 'badge-secondary',
    pending_approval: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
    paid: 'badge-primary',
}

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
    expense: 'مصروف',
    purchase_order: 'أمر شراء',
    discount_override: 'تجاوز خصم',
}

export const FISCAL_PERIOD_STATUS_LABELS: Record<FiscalPeriodStatus, string> = {
    open: 'مفتوح',
    closed: 'مغلق',
}

// ── Vault ────────────────────────────────────────────────────

export interface Vault {
    id: string
    name: string
    type: VaultType
    account_number: string | null
    bank_name: string | null
    current_balance: number
    responsible_id: string | null
    branch_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface VaultWithRefs extends Vault {
    responsible?: { full_name: string } | null
    branch?: { name: string } | null
}

export interface VaultInput {
    name: string
    type: VaultType
    account_number: string | null
    bank_name: string | null
    current_balance: number
    responsible_id: string | null
    branch_id: string | null
    is_active: boolean
}

export interface VaultFilters {
    page?: number
    pageSize?: number
    search?: string
    type?: VaultType
    is_active?: boolean
    branch_id?: string
}

// ── Vault Transaction ────────────────────────────────────────

export interface VaultTransaction {
    id: string
    vault_id: string
    type: VaultTransactionType
    amount: number
    balance_after: number
    reference_type: string | null
    reference_id: string | null
    description: string | null
    created_by: string | null
    created_at: string
}

export interface VaultTransactionWithRefs extends VaultTransaction {
    vault?: { name: string } | null
    creator?: { full_name: string } | null
}

export interface VaultTransactionFilters {
    page?: number
    pageSize?: number
    vault_id?: string
    type?: VaultTransactionType
    date_from?: string
    date_to?: string
}

// ── Custody Account ──────────────────────────────────────────

export interface CustodyAccount {
    id: string
    employee_id: string
    current_balance: number
    max_balance: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CustodyAccountWithRefs extends CustodyAccount {
    employee?: { profile?: { full_name: string } | null } | null
}

export interface CustodyFilters {
    page?: number
    pageSize?: number
    search?: string
    is_active?: boolean
}

// ── Custody Transaction ──────────────────────────────────────

export interface CustodyTransaction {
    id: string
    custody_id: string
    type: CustodyTransactionType
    amount: number
    balance_after: number
    reference_type: string | null
    reference_id: string | null
    description: string | null
    created_by: string | null
    created_at: string
}

export interface CustodyTransactionWithRefs extends CustodyTransaction {
    custody?: { employee?: { profile?: { full_name: string } | null } | null } | null
    creator?: { full_name: string } | null
}

export interface CustodyTransactionFilters {
    page?: number
    pageSize?: number
    custody_id?: string
    type?: CustodyTransactionType
    date_from?: string
    date_to?: string
}

// ── Chart of Accounts ────────────────────────────────────────

export interface ChartOfAccount {
    id: string
    code: string
    name: string
    type: AccountType
    parent_id: string | null
    is_active: boolean
    is_system: boolean
    created_at: string
    updated_at: string
}

export interface ChartOfAccountWithChildren extends ChartOfAccount {
    children?: ChartOfAccountWithChildren[]
}

// ── Fiscal Period ────────────────────────────────────────────

export interface FiscalPeriod {
    id: string
    name: string
    start_date: string
    end_date: string
    status: FiscalPeriodStatus
    closed_by: string | null
    closed_at: string | null
    created_at: string
}

// ── Journal Entry ────────────────────────────────────────────

export interface JournalEntry {
    id: string
    entry_number: string
    date: string
    description: string
    source_type: string | null
    source_id: string | null
    status: JournalStatus
    total_debit: number
    total_credit: number
    fiscal_period_id: string | null
    posted_by: string | null
    posted_at: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface JournalEntryLine {
    id: string
    entry_id: string
    account_id: string
    debit: number
    credit: number
    description: string | null
    created_at: string
}

export interface JournalEntryLineWithRefs extends JournalEntryLine {
    account?: { code: string; name: string } | null
}

export interface JournalEntryWithLines extends JournalEntry {
    lines?: JournalEntryLineWithRefs[]
    creator?: { full_name: string } | null
}

export interface JournalEntryFilters {
    page?: number
    pageSize?: number
    search?: string
    source_type?: string
    date_from?: string
    date_to?: string
    status?: JournalStatus
}

// ── Expense Category ─────────────────────────────────────────

export interface ExpenseCategory {
    id: string
    name: string
    parent_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface ExpenseCategoryWithChildren extends ExpenseCategory {
    children?: ExpenseCategoryWithChildren[]
}

export interface ExpenseCategoryInput {
    name: string
    parent_id: string | null
    is_active: boolean
}

// ── Expense ──────────────────────────────────────────────────

export interface Expense {
    id: string
    expense_number: string
    category_id: string | null
    amount: number
    vault_id: string | null
    custody_id: string | null
    status: ExpenseStatus
    description: string | null
    receipt_url: string | null
    expense_date: string
    requested_by: string | null
    approved_by: string | null
    approved_at: string | null
    rejection_reason: string | null
    branch_id: string | null
    created_at: string
    updated_at: string
}

export interface ExpenseWithRefs extends Expense {
    category?: { name: string } | null
    vault?: { name: string } | null
    custody?: { employee?: { profile?: { full_name: string } | null } | null } | null
    requester?: { full_name: string } | null
    approver?: { full_name: string } | null
    branch?: { name: string } | null
}

export interface ExpenseInput {
    category_id: string | null
    amount: number
    vault_id: string | null
    custody_id: string | null
    description: string | null
    receipt_url: string | null
    expense_date: string
    branch_id: string | null
}

export interface ExpenseFilters {
    page?: number
    pageSize?: number
    search?: string
    status?: ExpenseStatus
    category_id?: string
    vault_id?: string
    branch_id?: string
    date_from?: string
    date_to?: string
}

// ── Customer Payment ─────────────────────────────────────────

export interface CustomerPayment {
    id: string
    payment_number: string
    customer_id: string
    amount: number
    payment_method: PaymentMethodType
    vault_id: string | null
    custody_id: string | null
    collected_by: string | null
    status: PaymentStatus
    payment_date: string
    notes: string | null
    proof_id: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface CustomerPaymentWithRefs extends CustomerPayment {
    customer?: { name: string; code: string | null } | null
    vault?: { name: string } | null
    custody?: { employee?: { profile?: { full_name: string } | null } | null } | null
    collector?: { full_name: string } | null
}

export interface CustomerPaymentInput {
    customer_id: string
    amount: number
    payment_method: PaymentMethodType
    vault_id: string | null
    custody_id: string | null
    notes: string | null
    proof_id: string | null
}

export interface CustomerPaymentFilters {
    page?: number
    pageSize?: number
    search?: string
    status?: PaymentStatus
    customer_id?: string
    payment_method?: PaymentMethodType
    date_from?: string
    date_to?: string
}

// ── Supplier Payment ─────────────────────────────────────────

export interface SupplierPayment {
    id: string
    payment_number: string
    supplier_id: string
    amount: number
    payment_method: PaymentMethodType
    vault_id: string | null
    status: PaymentStatus
    payment_date: string
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export interface SupplierPaymentWithRefs extends SupplierPayment {
    supplier?: { name: string; code: string | null } | null
    vault?: { name: string } | null
    creator?: { full_name: string } | null
}

export interface SupplierPaymentInput {
    supplier_id: string
    amount: number
    payment_method: PaymentMethodType
    vault_id: string
    notes: string | null
}

export interface SupplierPaymentFilters {
    page?: number
    pageSize?: number
    search?: string
    status?: PaymentStatus
    supplier_id?: string
    payment_method?: PaymentMethodType
    date_from?: string
    date_to?: string
}

// ── Approval Rule ────────────────────────────────────────────

export interface ApprovalRule {
    id: string
    type: ApprovalType
    role_id: string | null
    user_id: string | null
    max_amount: number
    requires_escalation_above: number | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface ApprovalRuleWithRefs extends ApprovalRule {
    role?: { name: string } | null
    user?: { full_name: string } | null
}

export interface ApprovalRuleInput {
    type: ApprovalType
    role_id: string | null
    user_id: string | null
    max_amount: number
    requires_escalation_above: number | null
    is_active: boolean
}
