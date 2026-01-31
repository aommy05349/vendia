import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, User } from '@vendia/shared';
import { thaiBahtText } from '../utils/thaiBaht';

interface Shop {
    name: string;
    company_name?: string;
    bank_details?: string;
    address: string;
    phone: string;
    tax_id: string;
    email: string;
    logo_path: string;
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
    total: string;
    status: string;
    payment_method: string;
    created_at: string;
    user?: {
        name: string;
    };
    customer?: User;
    items: OrderItem[];
}

export const PrintOrder = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') || 'receipt';
    const [order, setOrder] = useState<Order | null>(null);
    const [shop, setShop] = useState<Shop | null>(null);

    useEffect(() => {
        // Fetch Shop Settings
        api.get('/shop').then(res => setShop(res.data)).catch(err => console.error(err));

        if (id) {
            api.get(`/orders/${id}`).then(res => {
                setOrder(res.data);
                // Wait for render then print
                setTimeout(() => {
                    window.print();
                }, 1000);
            });
        }
    }, [id]);

    if (!order || !shop) return <div className="p-5 text-center">Loading...</div>;

    const isQuotation = type === 'quotation';
    const isBillingNote = type === 'billing_note';
    
    let title = 'ใบเสร็จรับเงิน';
    let subtitle = 'RECEIPT';
    
    if (isQuotation) {
        title = 'ใบเสนอราคา';
        subtitle = 'QUOTATION';
    } else if (isBillingNote) {
        title = 'ใบวางบิล';
        subtitle = 'BILLING NOTE';
    }

    // Calculate valid date (e.g. 7 days from created_at)
    const validDate = new Date(order.created_at);
    validDate.setDate(validDate.getDate() + 7);

    return (
        <div className="container-fluid p-4" style={{ maxWidth: '1000px', background: 'white', minHeight: '100vh', fontSize: '12px' }}>
            {/* Header Section */}
            <div className="row mb-1">
                <div className="col-8">
                    <h2 className="fw-bold mb-0">{title}</h2>
                    <h4 className="fw-bold text-uppercase mb-4">{subtitle}</h4>

                    <div className="row" style={{ fontSize: '15px' }}>
                        <div className="col-2 fw-bold">ผู้ออก</div>
                        <div className="col-10">
                            <div className="fw-bold mb-1">{shop.company_name || shop.name}</div>
                            <div style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>{shop.address}</div>
                        </div>
                    </div>
                    <div className="row mt-1">
                        <div className="col-2 fw-bold">Issuer</div>
                        <div className="col-10 text-muted">
                            {/* Space for English Address if needed */}
                        </div>
                    </div>
                </div>
                <div className="col-4 text-end">
                    {shop.logo_path && (
                        <img 
                            src={`http://localhost:8000/storage/${shop.logo_path}`} 
                            alt="Logo" 
                            style={{ maxHeight: '100px', maxWidth: '100%' }} 
                            className="mb-2"
                        />
                    )}
                    <div className="fw-bold">{shop.name}</div>
                    <div>เลขผู้เสียภาษี Tax ID : {shop.tax_id}</div>
                    <div className="fw-bold mt-1">T: {shop.phone}</div>
                </div>
            </div>

            {/* Customer & Document Info */}
            <div className="row mb-1">
                <div className="col-7">
                    <div className="row mb-1">
                        <div className="col-4 fw-bold">ลูกค้า/Customer :</div>
                        <div className="col-8 fw-bold">
                            {order.customer?.company_name || order.customer?.name || 'Walk-in Customer'}
                        </div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold">ที่อยู่/Address :</div>
                        <div className="col-8" style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                            {order.customer?.address || '-'}
                        </div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold">เลขผู้เสียภาษี :</div>
                        <div className="col-8">Tax ID : {order.customer?.tax_id || '-'}</div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold">ผู้ติดต่อ / Attention :</div>
                        <div className="col-8">{order.customer?.name || '-'}</div>
                    </div>
                </div>
                <div className="col-5">
                    <div className="row mb-1">
                        <div className="col-4 fw-bold text-end">เลขที่/No :</div>
                        <div className="col-8">{order.id}</div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold text-end">วันที่ / ISSUE :</div>
                        <div className="col-8">{new Date(order.created_at).toLocaleDateString('th-TH')}</div>
                    </div>
                    {isQuotation && (
                        <div className="row mb-1">
                            <div className="col-4 fw-bold text-end">ใช้ได้ถึง/Valid :</div>
                            <div className="col-8">{validDate.toLocaleDateString('th-TH')}</div>
                        </div>
                    )}
                    <div className="row mb-1">
                        <div className="col-4 fw-bold text-end">Email :</div>
                        <div className="col-8" style={{ wordBreak: 'break-all' }}>{order.customer?.email && !order.customer.email.startsWith('cust_') ? order.customer.email : '-'}</div>
                    </div>
                    <div className="row mb-1">
                        <div className="col-4 fw-bold text-end">โทร :</div>
                        <div className="col-8">{order.customer?.phone || shop.phone}</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <table className="table table-bordered border-dark mb-0">
                <thead className="text-center align-middle bg-light">
                    <tr>
                        <th style={{ width: '60px' }}>ลำดับที่ (No.)</th>
                        <th>รายการ (DESCRIPTION)</th>
                        <th style={{ width: '80px' }}>จำนวน<br/>Quantity</th>
                        <th style={{ width: '120px' }}>ราคาต่อหน่วย<br/>Unit Price</th>
                        <th style={{ width: '120px' }}>ราคารวม(บาท)</th>
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
                            บาท / Baht
                        </td>
                        <td colSpan={3} className="bg-light fw-bold text-center">
                            ({thaiBahtText(Number(order.total))})
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={3} rowSpan={2} className="align-top">
                            {/* Bank Info & Remarks */}
                            <div className="text-danger fw-bold mb-2">***หมายเหตุ / Remarks***</div>
                            <div style={{ whiteSpace: 'pre-line', fontSize: '12px' }}>
                                {shop.remarks || '-'}
                            </div>
                        </td>
                        <td className="text-end fw-bold">ราคารวม<small>Sub Total</small></td>
                        <td className="text-end fw-bold align-middle">
                            {Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                    <tr>
                        <td className="text-end fw-bold">สุทธิ<small>Net Total</small></td>
                        <td className="text-end fw-bold fs-5 align-middle">
                            {Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
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
                    <div style={{ height: '80px' }}></div>
                    <div className="border-top w-75 mx-auto pt-2">
                        <div className="fw-bold">
                            {isQuotation ? 'อนุมัติโดย / Approved by' : 
                             isBillingNote ? 'ผู้รับวางบิล / Received by' : 
                             'ผู้รับสินค้า / Receiver'}
                        </div>
                        <div className="mt-4">ลงชื่อ..........................................................</div>
                        <div className="mt-2">วันที่ / Date ........................................</div>
                    </div>
                </div>
                <div className="col-6 text-center">
                    <div style={{ height: '80px' }}></div>
                    <div className="border-top w-75 mx-auto pt-2">
                        <div className="fw-bold">
                            {isQuotation ? 'ยอมรับใบเสนอราคา / Accepted by' : 
                             isBillingNote ? 'ผู้วางบิล / Billing by' : 
                             'ผู้รับเงิน / Collector'}
                        </div>
                        <div className="mt-4">ลงชื่อ..........................................................</div>
                        <div className="mt-2">วันที่ / Date ........................................</div>
                    </div>
                </div>
            </div>

            <div className="text-center mt-5 d-print-none">
                <button className="btn btn-primary btn-lg" onClick={() => window.print()}>Print Document</button>
            </div>
        </div>
    );
};
