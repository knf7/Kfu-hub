import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiSearch, FiSave, FiExternalLink, FiDollarSign } from 'react-icons/fi';
import { FaBalanceScale, FaWhatsapp } from 'react-icons/fa';
import { loansAPI } from '../../services/api';
import Layout from '../../components/layout/Layout';
import './NajizCasesPage.css';

const NajizCasesPage = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const requestIdRef = useRef(0);

    const parseMoneyInput = (value) => {
        if (value === null || value === undefined || value === '') return null;
        const raw = String(value);
        const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
        const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
        const normalizedDigits = raw
            .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String(persianDigits.indexOf(d)));
        const stripped = normalizedDigits.replace(/[٬،,]/g, '').replace(/[^\d.-]/g, '');
        if (!stripped || stripped === '-' || stripped === '.' || stripped === '-.') return null;
        const parsed = Number(stripped);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
    };

    const fetchCases = useCallback(async (forceFresh = false) => {
        const requestId = ++requestIdRef.current;
        try {
            setLoading(true);
            const params = { is_najiz_case: true, limit: 100, skip_count: true };
            if (forceFresh) {
                params._t = Date.now();
                params.force_fresh = '1';
            }
            const response = await loansAPI.getAll(params);
            if (requestId !== requestIdRef.current) return;
            const data = response.data || response;
            setCases(
                (data.loans || []).map((loan) => ({
                    ...loan,
                    najiz_case_amount: loan.najiz_case_amount ?? '',
                    najiz_collected_amount: loan.najiz_collected_amount ?? ''
                }))
            );
        } catch (error) {
            if (requestId !== requestIdRef.current) return;
            console.error('Failed to fetch Najiz cases:', error);
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchCases(true);
    }, [fetchCases]);

    const handleCollectedAmountChange = (id, value) => {
        setCases(prev => prev.map(c =>
            c.id === id ? { ...c, najiz_collected_amount: value } : c
        ));
    };

    const handleCaseAmountChange = (id, value) => {
        setCases(prev => prev.map(c =>
            c.id === id ? { ...c, najiz_case_amount: value } : c
        ));
    };

    const saveNajizDetails = async (loan) => {
        try {
            setUpdatingId(loan.id);
            const caseAmount = parseMoneyInput(loan.najiz_case_amount);
            const collectedAmount = parseMoneyInput(loan.najiz_collected_amount);

            if (loan.najiz_case_amount !== '' && caseAmount === null) {
                alert('مبلغ السند غير صالح');
                return;
            }
            if (loan.najiz_collected_amount !== '' && collectedAmount === null) {
                alert('المبلغ المتحصل عليه غير صالح');
                return;
            }

            const response = await loansAPI.updateNajizCase(loan.id, {
                is_najiz_case: true,
                najiz_case_amount: caseAmount,
                najiz_collected_amount: collectedAmount
            });
            const updatedLoan = response?.data?.loan || null;
            if (updatedLoan) {
                setCases((prev) => prev.map((row) => (
                    row.id === loan.id
                        ? {
                            ...row,
                            ...updatedLoan,
                            najiz_case_amount: updatedLoan.najiz_case_amount ?? '',
                            najiz_collected_amount: updatedLoan.najiz_collected_amount ?? ''
                        }
                        : row
                )));
            }

            // Force-fresh re-fetch to avoid any stale cache artifact.
            setTimeout(() => fetchCases(true), 250);
        } catch (error) {
            alert(error?.response?.data?.error || 'فشل حفظ المبلغ');
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredCases = cases.filter(c =>
        (c.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.national_id || '').includes(searchTerm) ||
        (c.najiz_case_number || '').includes(searchTerm)
    );

    return (
        <Layout>
            <div className="najiz-page-header">
                <div className="header-info">
                    <h1><FaBalanceScale className="header-icon" /> قضايا ناجز</h1>
                    <p>إدارة وتحصيل المبالغ للقضايا المرفوعة في منصة ناجز</p>
                </div>
                <div className="header-actions">
                    <div className="search-box">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="بحث بالاسم، الهوية، أو رقم القضية..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">جاري تحميل القضايا...</div>
            ) : (
                <div className="cases-grid">
                    {filteredCases.length === 0 ? (
                        <div className="empty-cases">
                            <FaBalanceScale size={48} />
                            <p>لا توجد قضايا مرفوعة حالياً</p>
                        </div>
                    ) : (
                        filteredCases.map(loan => (
                            <div key={loan.id} className="case-card glass-card">
                                <div className="case-card-header">
                                    <div className="customer-info">
                                        <h3>{loan.customer_name}</h3>
                                        <span>{loan.national_id}</span>
                                    </div>
                                    <div className="case-badge">
                                        {loan.najiz_status || 'قيد المعالجة'}
                                    </div>
                                </div>

                                <div className="case-details">
                                    <div className="detail-item">
                                        <label>رقم القضية</label>
                                        <div className="detail-value">{loan.najiz_case_number || 'غير محدد'}</div>
                                    </div>
                                    <div className="detail-item">
                                        <label>مبلغ المطالبة</label>
                                        <div className="detail-value highlight">{Number(loan.amount || 0).toLocaleString('ar-SA')} ر.س</div>
                                    </div>
                                    <div className="detail-item" style={{ flex: '1 1 100%' }}>
                                        <label>مبلغ السند</label>
                                        <div className="input-with-action" style={{ display: 'flex', gap: '8px' }}>
                                            <div className="amount-input-wrapper" style={{ flex: 1 }}>
                                                <FiDollarSign className="input-icon" />
                                                <input
                                                    type="number"
                                                    value={loan.najiz_case_amount || ''}
                                                    placeholder="مبلغ السند"
                                                    onChange={(e) => handleCaseAmountChange(loan.id, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="collection-section">
                                    <label>المبلغ المتحصل عليه (أو القرض الجديد)</label>
                                    <div className="input-with-action">
                                        <div className="amount-input-wrapper" style={{ flex: 1 }}>
                                            <FiDollarSign className="input-icon" />
                                            <input
                                                type="number"
                                                value={loan.najiz_collected_amount || ''}
                                                placeholder="0.00"
                                                onChange={(e) => handleCollectedAmountChange(loan.id, e.target.value)}
                                            />
                                        </div>
                                        <button
                                            className={`btn-save ${updatingId === loan.id ? 'loading' : ''}`}
                                            onClick={() => saveNajizDetails(loan)}
                                            disabled={updatingId === loan.id}
                                        >
                                            <FiSave /> {updatingId === loan.id ? 'جاري الحفظ...' : 'حفظ'}
                                        </button>
                                    </div>
                                </div>

                                <div className="case-card-footer">
                                    <div className="footer-links">
                                        {loan.najizLink && (
                                            <a href={loan.najizLink} target="_blank" rel="noopener noreferrer" className="link-najiz">
                                                <FiExternalLink /> ناجز
                                            </a>
                                        )}
                                        {loan.whatsappLink && (
                                            <a href={loan.whatsappLink} target="_blank" rel="noopener noreferrer" className="link-whatsapp">
                                                <FaWhatsapp /> واتساب
                                            </a>
                                        )}
                                    </div>
                                    <div className="transaction-date">
                                        المعاملة: {new Date(loan.transaction_date).toLocaleDateString('ar-SA')}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </Layout>
    );
};

export default NajizCasesPage;
