'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Mail, Phone, CreditCard, User as UserIcon, Briefcase, FileText, StickyNote, Banknote, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersAPI, loansAPI } from '@/lib/api';
import '../customers.css';

export default function CustomerProfilePage() {
    const params = useParams();
    const id = params.id as string;
    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

    const { data: customerPayload, isLoading, isError } = useQuery({
        queryKey: ['customer-profile', id],
        queryFn: async () => {
            const res = await customersAPI.getById(id);
            return res.data;
        },
        enabled: !!id
    });

    const customer = customerPayload?.customer ?? customerPayload;
    const customerOverviewLoans = Array.isArray(customerPayload?.loans) ? customerPayload.loans : [];

    const { data: loansData, isLoading: isLoadingLoans } = useQuery({
        queryKey: ['loans', 'customer', id],
        queryFn: async () => {
            const res = await loansAPI.getAll({ customerId: id, limit: 200, page: 1 });
            return res.data;
        },
        enabled: activeTab === 'history' && !!id
    });

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <div className="db-spinner"></div>
            </div>
        );
    }

    if (isError || !customer) {
        return (
            <div className="flex flex-col gap-4 h-[400px] items-center justify-center">
                <p className="text-red-500 font-bold">تعذر تحميل بيانات العميل أو أن العميل غير موجود.</p>
                <Button variant="outline" asChild><Link href="/dashboard/customers">العودة للعملاء</Link></Button>
            </div>
        );
    }

    const formatTimelineDate = (value?: string | null) => {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
    };

    type TimelineItem = {
        id: string;
        type: 'registration' | 'note' | 'loan' | 'document';
        title: string;
        date: string;
        sortAt: number;
        icon: ReactNode;
        body: string;
        attachmentUrl?: string | null;
        attachmentLabel?: string | null;
    };

    const timelineItems: TimelineItem[] = [];
    
    if (customer.created_at) {
        const createdAt = new Date(customer.created_at);
        timelineItems.push({
            id: `registration-${customer.id}`,
            type: 'registration',
            title: 'تسجيل العميل في النظام',
            date: formatTimelineDate(customer.created_at),
            sortAt: createdAt.getTime(),
            icon: <UserIcon size={14} />,
            body: `تم تسجيل العميل ${customer.full_name || customer.name || 'العميل'} في النظام.`
        });
    }

    if (customer.notes) {
        const noteDateRaw = customer.updated_at || customer.created_at;
        const noteDate = new Date(noteDateRaw);
        timelineItems.push({
            id: `customer-note-${customer.id}`,
            type: 'note',
            title: 'ملاحظة على ملف العميل',
            date: formatTimelineDate(noteDateRaw),
            sortAt: noteDate.getTime(),
            icon: <StickyNote size={14} />,
            body: String(customer.notes)
        });
    }

    const detailedLoans = Array.isArray(loansData?.loans) ? loansData.loans : [];
    const loansForHistory = detailedLoans.length > 0 ? detailedLoans : customerOverviewLoans;

    if (Array.isArray(loansForHistory)) {
        loansForHistory.forEach((loan: any) => {
            const loanDateRaw = loan.transaction_date || loan.created_at;
            const loanDate = new Date(loanDateRaw);
            const amount = Number(loan.amount || 0);
            timelineItems.push({
                id: `loan-${loan.id}`,
                type: 'loan',
                title: 'إنشاء قرض جديد',
                date: formatTimelineDate(loanDateRaw),
                sortAt: loanDate.getTime(),
                icon: <Banknote size={14} />,
                body: `قرض رقم #${loan.id} بقيمة ${amount.toLocaleString('en-US')} ر.س — الحالة: ${loan.status || 'غير معروفة'}`
            });

            if (loan.notes) {
                timelineItems.push({
                    id: `loan-note-${loan.id}`,
                    type: 'note',
                    title: 'ملاحظة على القرض',
                    date: formatTimelineDate(loan.updated_at || loanDateRaw),
                    sortAt: new Date(loan.updated_at || loanDateRaw).getTime(),
                    icon: <StickyNote size={14} />,
                    body: String(loan.notes)
                });
            }

            if (loan.receipt_image_url || loan.receipt_number) {
                const documentBody = loan.receipt_number
                    ? `تم إرفاق مستند للقرض (رقم السند: ${loan.receipt_number}).`
                    : 'تم إرفاق مستند للقرض.';
                timelineItems.push({
                    id: `loan-doc-${loan.id}`,
                    type: 'document',
                    title: 'مستند مرتبط بالقرض',
                    date: formatTimelineDate(loan.updated_at || loanDateRaw),
                    sortAt: new Date(loan.updated_at || loanDateRaw).getTime(),
                    icon: <FileText size={14} />,
                    body: documentBody,
                    attachmentUrl: loan.receipt_image_url || null,
                    attachmentLabel: loan.receipt_number ? `عرض السند ${loan.receipt_number}` : 'عرض المرفق'
                });
            }
        });
    }

    timelineItems.sort((a, b) => b.sortAt - a.sortAt);

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/customers">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{customer.full_name || customer.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                            رقم الهوية: {customer.national_id}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 font-bold shadow-sm">
                        <Edit className="h-4 w-4" />
                        تعديل الملف
                    </Button>
                    <Button className="gap-2 font-bold bg-blue-600 hover:bg-blue-700 shadow-sm" asChild>
                        <Link href={`/dashboard/loans/new?customerId=${customer.id}`}>
                            <CreditCard className="h-4 w-4" />
                            إقراض العميل
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="cus-tabs gap-0">
                <div className="cus-tab-list">
                    <button 
                       className={`cus-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                       onClick={() => setActiveTab('overview')}
                    >
                        نظرة عامة
                    </button>
                    <button 
                       className={`cus-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                       onClick={() => setActiveTab('history')}
                    >
                        تاريخ ومستندات العميل
                    </button>
                </div>

                {activeTab === 'overview' && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <Card className="lg:col-span-2 border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md dark:bg-slate-900/60">
                          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                              <CardTitle className="text-lg font-bold">معلومات الاتصال والبيانات</CardTitle>
                              <CardDescription className="text-xs font-semibold">قنوات التواصل والتركيبة السكانية.</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-5">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                                             <Phone className="h-4 w-4" />
                                          </div>
                                          <div>
                                              <p className="text-xs font-bold text-slate-500">الجوال</p>
                                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200" dir="ltr">{customer.mobile_number}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600">
                                             <Mail className="h-4 w-4" />
                                          </div>
                                          <div>
                                              <p className="text-xs font-bold text-slate-500">البريد الإلكتروني</p>
                                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{customer.email || 'غير متوفر'}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600">
                                              <UserIcon className="h-4 w-4" />
                                          </div>
                                          <div>
                                              <p className="text-xs font-bold text-slate-500">الحالة الديموغرافية</p>
                                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                  {customer.gender ? customer.gender + ' • ' : ''}
                                                  {customer.marital_status || 'الحالة غير محددة'}
                                                  {customer.dependents ? ` • ${customer.dependents} معالين` : ''}
                                              </p>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="space-y-5">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600">
                                              <Briefcase className="h-4 w-4" />
                                          </div>
                                          <div>
                                              <p className="text-xs font-bold text-slate-500">جهة العمل</p>
                                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                  {customer.workplace || 'غير محدد'}
                                                  {customer.salary ? ` • ﷼ ${Number(customer.salary).toLocaleString()}/يوم` : ''}
                                              </p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <div className="p-2.5 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600">
                                              <CreditCard className="h-4 w-4" />
                                          </div>
                                          <div>
                                              <p className="text-xs font-bold text-slate-500">التقييم الائتماني (سمة)</p>
                                              <div className="mt-1">
                                                  <Badge variant={customer.credit_score && customer.credit_score > 700 ? "default" : "secondary"}>
                                                      {customer.credit_score || 'غير متاح'}
                                                  </Badge>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>

                      <Card className="border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md dark:bg-slate-900/60">
                          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                              <CardTitle className="text-lg font-bold">بيانات الأنظمة</CardTitle>
                              <CardDescription className="text-xs font-semibold">المعلومات الإدارية.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-6">
                              <div>
                                  <p className="text-xs font-bold text-slate-500">الرقم المرجعي (System ID)</p>
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">#{customer.id}</p>
                              </div>
                             <div>
                                  <p className="text-xs font-bold text-slate-500">تاريخ التسجيل</p>
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                      {formatTimelineDate(customer.created_at)}
                                  </p>
                              </div>
                              <div>
                                  <p className="text-xs font-bold text-slate-500">الملاحظات الداخلية الخفية</p>
                                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                                      <p className="text-xs font-semibold text-red-800 dark:text-red-400">
                                          {customer.notes || 'لا توجد ملاحظات على هذا العميل.'}
                                      </p>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="cus-timeline max-w-3xl">
                         {isLoadingLoans ? (
                            <div className="py-12 flex justify-center"><div className="db-spinner"></div></div>
                         ) : timelineItems.length === 0 ? (
                            <p className="text-center text-slate-500 py-12 font-bold">لا يوجد سجل تاريخي متوفر للعميل بعد.</p>
                         ) : (
                             timelineItems.map((item) => (
                                <div className="timeline-item" key={item.id}>
                                    <div className="timeline-marker">
                                        {item.icon}
                                    </div>
                                    <div className="timeline-content">
                                        <div className="timeline-header">
                                            <h4 className="timeline-title">{item.title}</h4>
                                            <span className="timeline-date">{item.date}</span>
                                        </div>
                                        <div className="timeline-body">
                                            {item.body}
                                        </div>
                                        {item.type === 'document' && item.attachmentUrl && (
                                            <div className="document-card">
                                                <FileText size={16} className="text-slate-500" />
                                                <a
                                                    href={item.attachmentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-semibold text-blue-700 hover:underline dark:text-blue-400"
                                                >
                                                    {item.attachmentLabel || 'فتح المستند'}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             ))
                         )}
                     </div>
                  </div>
                )}
            </div>
        </div>
    );
}
