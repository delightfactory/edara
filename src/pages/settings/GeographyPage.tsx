import { useState, useEffect, useCallback } from 'react'
import { MapPin, ChevronLeft } from 'lucide-react'
import { getGovernorates, getCities, getAreas } from '@/lib/services/geography'
import type { Governorate, CityWithRefs, AreaWithRefs } from '@/lib/types/geography'
import { usePageTitle } from '@/lib/hooks/usePageTitle'
import { toast } from 'sonner'

export function GeographyPage() {
    usePageTitle('التقسيم الجغرافي')

    const [governorates, setGovernorates] = useState<Governorate[]>([])
    const [cities, setCities] = useState<CityWithRefs[]>([])
    const [areas, setAreas] = useState<AreaWithRefs[]>([])
    const [loading, setLoading] = useState(true)

    const [selectedGov, setSelectedGov] = useState<Governorate | null>(null)
    const [selectedCity, setSelectedCity] = useState<CityWithRefs | null>(null)

    const loadGovernorates = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getGovernorates()
            setGovernorates(data)
        } catch {
            toast.error('خطأ في تحميل المحافظات')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadGovernorates() }, [loadGovernorates])

    const selectGovernorate = async (gov: Governorate) => {
        setSelectedGov(gov)
        setSelectedCity(null)
        setAreas([])
        setLoading(true)
        try {
            const data = await getCities(gov.id)
            setCities(data)
        } catch {
            toast.error('خطأ في تحميل المدن')
        } finally {
            setLoading(false)
        }
    }

    const selectCity = async (city: CityWithRefs) => {
        setSelectedCity(city)
        setLoading(true)
        try {
            const data = await getAreas(city.id)
            setAreas(data)
        } catch {
            toast.error('خطأ في تحميل المناطق')
        } finally {
            setLoading(false)
        }
    }

    const goBack = () => {
        if (selectedCity) {
            setSelectedCity(null)
            setAreas([])
        } else if (selectedGov) {
            setSelectedGov(null)
            setCities([])
        }
    }

    const currentTitle = selectedCity ? `مناطق ${selectedCity.name}` : selectedGov ? `مدن ${selectedGov.name}` : 'المحافظات'
    const currentItems = selectedCity ? areas : selectedGov ? cities : governorates

    return (
        <div className="space-y-6 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/30">
                    <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <h1 className="page-title">التقسيم الجغرافي</h1>
                    <p className="page-subtitle">{currentTitle}</p>
                </div>
            </div>

            {/* Breadcrumb */}
            {(selectedGov || selectedCity) && (
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={goBack} className="btn btn-ghost text-xs gap-1" style={{ color: 'var(--text-muted)' }}>
                        <ChevronLeft className="h-3.5 w-3.5" /> رجوع
                    </button>
                    <span style={{ color: 'var(--text-muted)' }}>|</span>
                    <button onClick={() => { setSelectedGov(null); setSelectedCity(null); setCities([]); setAreas([]) }}
                        className="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">المحافظات</button>
                    {selectedGov && (
                        <>
                            <span style={{ color: 'var(--text-muted)' }}>/</span>
                            <button onClick={() => { setSelectedCity(null); setAreas([]); selectGovernorate(selectedGov) }}
                                className="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">{selectedGov.name}</button>
                        </>
                    )}
                    {selectedCity && (
                        <>
                            <span style={{ color: 'var(--text-muted)' }}>/</span>
                            <span >{selectedCity.name}</span>
                        </>
                    )}
                </div>
            )}

            <div className="edara-card overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            {!selectedGov && <th>عدد المدن</th>}
                            {selectedGov && !selectedCity && <th>المحافظة</th>}
                            {selectedCity && <th>المدينة</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={2} className="data-table-empty">جارٍ التحميل...</td></tr>
                        ) : currentItems.length === 0 ? (
                            <tr><td colSpan={2} className="data-table-empty">لا توجد عناصر</td></tr>
                        ) : !selectedGov ? (
                            // Governorates list
                            governorates.map(g => (
                                <tr key={g.id} className="cursor-pointer hover:opacity-80" onClick={() => selectGovernorate(g)}>
                                    <td >{g.name} {g.name_en ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({g.name_en})</span> : ''}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>—</td>
                                </tr>
                            ))
                        ) : !selectedCity ? (
                            // Cities list
                            cities.map(c => (
                                <tr key={c.id} className="cursor-pointer hover:opacity-80" onClick={() => selectCity(c)}>
                                    <td >{c.name} {c.name_en ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({c.name_en})</span> : ''}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{c.governorate?.name || '—'}</td>
                                </tr>
                            ))
                        ) : (
                            // Areas list
                            areas.map(a => (
                                <tr key={a.id}>
                                    <td >{a.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{a.city?.name || '—'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
