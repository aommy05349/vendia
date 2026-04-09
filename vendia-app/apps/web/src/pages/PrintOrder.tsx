import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, Customer } from '@vendia/shared';
import { thaiBahtText } from '../utils/thaiBaht';
import { useTranslation } from 'react-i18next';

interface Shop {
    name: string;
    company_name?: string;
    bank_details?: string;
    address: string;
    phone: string;
    tax_id: string;
    email: string;
    logo_path: string;
    signature_path?: string;
    footer_text?: string;
    remarks?: string;
}

interface OrderItem {
    id: number;
    product: {
        name: string;
        sku: string;
    };
    quantity: number;
    price: number;
}

interface Order {
    id: number;
    subtotal?: string;
    vat_rate?: string;
    vat_amount?: string;
    withholding_rate?: string;
    withholding_amount?: string;
    total: string;
    status: string;
    payment_method: string;
    created_at: string;
    quotation_number?: string;
    billing_note_number?: string;
    receipt_number?: string;
    user?: {
        name: string;
    };
    customer?: Customer;
    items: OrderItem[];
}

export const PrintOrder = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') || 'receipt';
    const [order, setOrder] = useState<Order | null>(null);
    const [shop, setShop] = useState<Shop | null>(null);
    const printedRef = useRef(false);

    const getImageUrl = (path: string) => {
        if (!path) return '';

        const apiUrlRaw = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';
        const apiUrl = typeof apiUrlRaw === 'string' ? apiUrlRaw : 'http://localhost:8000/api';
        const apiUrlNormalized = apiUrl.replace(/^https:\/(?!\/)/, 'https://').replace(/^http:\/(?!\/)/, 'http://');
        const origin = apiUrlNormalized.replace(/\/api\/?$/, '');

        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path
                .replace(/^https:\/(?!\/)/, 'https://')
                .replace(/^http:\/(?!\/)/, 'http://')
                .replace('/api/storage/', '/storage/');
        }

        let normalizedPath = path.startsWith('/') ? path : `/${path}`;
        if (normalizedPath.startsWith('/api/storage/')) {
            normalizedPath = normalizedPath.replace(/^\/api\/storage\//, '/storage/');
        }

        if (!normalizedPath.startsWith('/storage/')) {
            return `${origin}/storage${normalizedPath}`;
        }
        return `${origin}${normalizedPath}`;
    };

    useEffect(() => {
        // Fetch Shop Settings
        api.get('/shop').then(res => setShop(res.data)).catch(err => console.error(err));

        if (id) {
            api.get(`/orders/${id}`).then(res => {
                setOrder(res.data);
            });
        }
    }, [id]);

    useEffect(() => {
        if (!order || !shop) return;
        if (printedRef.current) return;
        printedRef.current = true;

        const waitForImages = async () => {
            const imgs = Array.from(document.images || []) as HTMLImageElement[];
            const pending = imgs.map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise<void>((resolve) => {
                    const cleanup = () => {
                        img.removeEventListener('load', cleanup);
                        img.removeEventListener('error', cleanup);
                        resolve();
                    };
                    img.addEventListener('load', cleanup);
                    img.addEventListener('error', cleanup);
                });
            });

            const timeoutMs = 4000;
            await Promise.race([
                Promise.all(pending),
                new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
            ]);
        };

        setTimeout(() => {
            waitForImages().finally(() => {
                window.print();
            });
        }, 300);
    }, [order, shop]);

    if (!order || !shop) return <div className="p-5 text-center">{t('common.loading')}</div>;

    const isQuotation = type === 'quotation';
    const isBillingNote = type === 'billing_note';
    
    let title = t('print.receipt.title');
    let subtitle = t('print.receipt.subtitle');
    
    if (isQuotation) {
        title = t('print.quotation.title');
        subtitle = t('print.quotation.subtitle');
    } else if (isBillingNote) {
        title = t('print.billing_note.title');
        subtitle = t('print.billing_note.subtitle');
    }

    // Calculate valid date (e.g. 7 days from created_at)
    const validDate = new Date(order.created_at);
    validDate.setDate(validDate.getDate() + 7);

    const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const subtotal = Number(order.subtotal ?? order.total);
    const vatRate = Number(order.vat_rate ?? 0);
    const vatAmount =
        order.vat_amount !== undefined
            ? Number(order.vat_amount)
            : round2((subtotal * vatRate) / 100);
    const totalWithVat = round2(subtotal + vatAmount);
    const withholdingRate = Number(order.withholding_rate ?? 0);
    const withholdingAmount =
        order.withholding_amount !== undefined
            ? Number(order.withholding_amount)
            : round2((subtotal * withholdingRate) / 100);
    const payable = round2(totalWithVat - withholdingAmount);
    const showWithholding = withholdingRate > 0 && !isQuotation;
    const payableForDocument = showWithholding ? payable : totalWithVat;
    const summaryRowCount = 2 + (vatRate > 0 ? 1 : 0) + (showWithholding ? 2 : 0);
    const attention =
        order.customer?.is_company
            ? (typeof order.customer?.contact_name === 'string' ? order.customer.contact_name.trim() : '')
            : (typeof order.customer?.name === 'string' ? order.customer.name.trim() : '');

    return (
        <div className="container-fluid p-4 print-root" style={{ maxWidth: '1000px', background: 'white', fontSize: '12px' }}>
            <style>
                {`
@page {
  size: A4 portrait;
  margin: 15mm 10mm 10mm 10mm;
}

@media print {
  html, body {
    background: #fff !important;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-root {
    padding: 4mm 0 0 0 !important;
    margin: 0 auto !important;
    width: 190mm !important;
    max-width: 190mm !important;
    font-size: 12px !important;
    line-height: 1.15 !important;
  }

  .print-root .row,
  .print-root [class^="col-"],
  .print-root [class*=" col-"] {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .print-root table {
    table-layout: fixed;
    width: 100%;
  }

  .print-root thead {
    display: table-header-group;
  }

  .print-root tfoot {
    display: table-footer-group;
  }

  .print-root tr,
  .print-root th,
  .print-root td {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .print-root td,
  .print-root th {
    padding: 3px 6px !important;
    vertical-align: top;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .print-root .border-bottom-0 {
    border-bottom: 1px solid #212529 !important;
  }
}
                `}
            </style>
            {/* Header Section */}
            <div className="row mb-1">
                <div className="col-8">
                    <h2 className="fw-bold mb-0">{title}</h2>
                    <h4 className="fw-bold text-uppercase mb-4">{subtitle}</h4>

                    <div className="row" style={{ fontSize: '15px' }}>
                        <div className="col-2 fw-bold">{t('print.issuer.label_th')}</div>
                        <div className="col-10">
                            <div className="fw-bold mb-1">{shop.company_name || shop.name}</div>
                            <div style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>{shop.address}</div>
                        </div>
                    </div>
                    <div className="row mt-1">
                        <div className="col-2 fw-bold">{t('print.issuer.label_en')}</div>
                        <div className="col-10 text-muted">
                            {/* Space for English Address if needed */}
                        </div>
                    </div>
                </div>
                <div className="col-4 text-end">
                    {shop.logo_path && (
                        <img 
                            src={getImageUrl(shop.logo_path)} 
                            alt="Logo" 
                            style={{ maxHeight: '100px', maxWidth: '100%' }} 
                            className="mb-2"
                        />
                    )}
                    <div className="fw-bold">{shop.name}</div>
                    <div>{t('print.customer.tax_id')} {shop.tax_id}</div>
                    <div className="fw-bold mt-1">{t('print.document.phone')} {shop.phone}</div>
                </div>
            </div>

            {/* Customer & Document Info */}
            <div className="row mb-1">
                <div className="col-7">
                    <div className="row mb-1">
                        <div className="col-4 fw-bold">{t('print.customer.label')}</div>
                        <div className="col-8 fw-bold">
                            {order.customer?.company_name || order.customer?.name || 'Walk-in Customer'}
                        </div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold">{t('print.customer.address')}</div>
                        <div className="col-8" style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                            {order.customer?.address || '-'}
                        </div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold">{t('print.customer.tax_id')}</div>
                        <div className="col-8">{order.customer?.tax_id || '-'}</div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold">{t('print.customer.attention')}</div>
                        <div className="col-8">{order.customer?.is_company ? attention : (attention || '-')}</div>
                    </div>
                </div>
                <div className="col-5">
                    <div className="row mb-1">
                        <div className="col-4 fw-bold text-end">{t('print.document.no')}</div>
                        <div className="col-8">
                            {isQuotation 
                                ? (order.quotation_number || order.id) 
                                : isBillingNote 
                                    ? (order.billing_note_number || order.id) 
                                    : (order.receipt_number || order.id)
                            }
                        </div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold text-end">{t('print.document.date')}</div>
                        <div className="col-8">{new Date(order.created_at).toLocaleDateString('th-TH')}</div>
                    </div>
                    {isQuotation && (
                        <div className="row mb-1">
                            <div className="col-4 fw-bold text-end">{t('print.document.valid')}</div>
                            <div className="col-8">{validDate.toLocaleDateString('th-TH')}</div>
                        </div>
                    )}
                    <div className="row mb-1">
                        <div className="col-4 fw-bold text-end">{t('print.document.email')}</div>
                        <div className="col-8" style={{ wordBreak: 'break-all' }}>{order.customer?.email && !order.customer.email.startsWith('cust_') && !order.customer.email.endsWith('@vendia.local') && !order.customer.email.endsWith('@example.com') ? order.customer.email : '-'}</div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold text-end">{t('print.document.phone')}</div>
                        <div className="col-8">{order.customer?.phone || shop.phone}</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <table className="table table-bordered border-dark mb-0">
                <thead className="text-center align-middle bg-light">
                    <tr>
                        <th style={{ width: '60px' }}>{t('print.table.no')}</th>
                        <th>{t('print.table.description')}</th>
                        <th style={{ width: '80px' }} dangerouslySetInnerHTML={{ __html: t('print.table.quantity') }}></th>
                        <th style={{ width: '120px' }} dangerouslySetInnerHTML={{ __html: t('print.table.unit_price') }}></th>
                        <th style={{ width: '120px' }}>{t('print.table.total')}</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="text-center border-bottom-0">{idx + 1}</td>
                            <td className="border-bottom-0">
                                <div>{item.product?.name}</div>
                            </td>
                            <td className="text-center border-bottom-0">{item.quantity}</td>
                            <td className="text-end border-bottom-0">{Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="text-end bg-success bg-opacity-10 fw-bold border-bottom-0">
                                {(Number(item.price) * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={2} className="text-center bg-light">
                            {t('print.footer.baht_text')}
                        </td>
                        <td colSpan={3} className="bg-light fw-bold text-center">
                            ({thaiBahtText(Number(payableForDocument))})
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={3} rowSpan={summaryRowCount} className="align-top">
                            {/* Bank Info & Remarks */}
                            <div className="text-danger fw-bold mb-2">{t('print.footer.remarks')}</div>
                            <div style={{ whiteSpace: 'pre-line', fontSize: '12px' }}>
                                {shop.remarks || '-'}
                            </div>
                        </td>
                        <td className="text-end fw-bold">{t('print.footer.subtotal')}<small>{t('print.footer.subtotal_en')}</small></td>
                        <td className="text-end fw-bold align-middle">
                            {Number(subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                    {vatRate > 0 && (
                        <tr>
                            <td className="text-end fw-bold">{t('print.footer.vat')} ({vatRate}%)</td>
                            <td className="text-end fw-bold align-middle">
                                {Number(vatAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    )}
                    <tr>
                        <td className="text-end fw-bold">{t('print.footer.net_total')}<small>{t('print.footer.net_total_en')}</small></td>
                        <td className="text-end fw-bold fs-5 align-middle">
                            {Number(totalWithVat).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                    {showWithholding && (
                        <tr>
                            <td className="text-end fw-bold">{t('print.footer.withholding')} ({withholdingRate}%)</td>
                            <td className="text-end fw-bold align-middle">
                                -{Number(withholdingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    )}
                    {showWithholding && (
                        <tr>
                            <td className="text-end fw-bold">{t('print.footer.payable')}</td>
                            <td className="text-end fw-bold fs-5 align-middle">
                                {Number(payable).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    )}
                </tfoot>
            </table>

            {/* Bank Details & Signature Section */}
            <div className="row mt-1">
                <div className="col-7 mb-4">
                    <div className="text-danger fw-bold" style={{ whiteSpace: 'pre-line', fontSize: '14px' }}>
                        {shop.bank_details || '-'}
                    </div>
                </div>
                <div className="col-5 text-end mb-4">
                    <div style={{ whiteSpace: 'pre-line', fontSize: '14px', fontWeight: 'bold' }}>
                        {shop.footer_text}
                    </div>
                </div>
            </div>

            <div className="row mt-2" style={{ fontSize: '15px' }}>
                <div className="col-6 text-center">
                    <div style={{ height: '80px' }}>
                        {isQuotation && shop.signature_path && (
                             <img 
                                src={getImageUrl(shop.signature_path)} 
                                alt="Signature" 
                                style={{ maxHeight: '80px' }} 
                            />
                        )}
                    </div>
                    <div className="border-top w-75 mx-auto pt-2">
                        <div className="fw-bold">
                            {isQuotation ? t('print.signatures.approved') : 
                             isBillingNote ? t('print.signatures.received_billing') : 
                             t('print.signatures.receiver')}
                        </div>
                        <div className="mt-4">{t('print.signatures.sign')}</div>
                        <div className="mt-2">{t('print.signatures.date')}</div>
                    </div>
                </div>
                <div className="col-6 text-center">
                    <div style={{ height: '80px' }}>
                        {!isQuotation && shop.signature_path && (
                             <img 
                                src={getImageUrl(shop.signature_path)} 
                                alt="Signature" 
                                style={{ maxHeight: '80px' }} 
                            />
                        )}
                    </div>
                    <div className="border-top w-75 mx-auto pt-2">
                        <div className="fw-bold">
                            {isQuotation ? t('print.signatures.accepted') : 
                             isBillingNote ? t('print.signatures.billing') : 
                             t('print.signatures.collector')}
                        </div>
                        <div className="mt-4">{t('print.signatures.sign')}</div>
                        <div className="mt-2">{t('print.signatures.date')}</div>
                    </div>
                </div>
            </div>

            <div className="text-center mt-5 d-print-none">
                <button className="btn btn-primary btn-lg" onClick={() => window.print()}>{t('print.button')}</button>
            </div>
        </div>
    );
};
