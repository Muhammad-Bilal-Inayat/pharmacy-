import { v4 as uuidv4 } from 'uuid';
import { 
  dbMedicines, dbSuppliers, dbInvoices, dbPurchaseOrders, 
  dbPartyPayments, dbExpenses, dbBankAccounts, dbBankTransactions, dbCheques, dbLoanAccounts,
  dbAppUsers, dbUserActivities, dbOnlineOrders, dbOnlinePromotions, dbStoreSettings
} from './db';
import { 
  Medicine, Supplier, Party, Invoice, PurchaseOrder, 
  PartyPayment, Expense, BankAccount, BankTransaction, ChequeRecord, LoanAccount,
  AppUserRecord, UserActivityLog, OnlineOrder
} from '../types';
import { DEFAULT_STORE_SETTINGS, DEFAULT_PROMOTIONS } from './storeManager';


export const DUMMY_MEDICINES: Medicine[] = [
  {
    id: 'med-10cc-bio',
    barcode: '8964000190011',
    name: '10CC BIO',
    batchNumber: 'BIO-10C',
    manufacturer: 'Bio-Care Surgical',
    category: 'Syringes',
    unit: 'PCS',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 500).toISOString(),
    quantity: -100,
    lowStockThreshold: 20,
    purchasePrice: 13,
    mrp: 20,
    sellingPrice: 18,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-5-1000-uni',
    barcode: '8964000190028',
    name: '5% 1000ML UNI',
    batchNumber: 'UNI-1000',
    manufacturer: 'Uni-Pack Healthcare',
    category: 'IV Infusions',
    unit: 'BOTTLE',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 400).toISOString(),
    quantity: -10,
    lowStockThreshold: 20,
    purchasePrice: 120,
    mrp: 160,
    sellingPrice: 140,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-5-500-uni',
    barcode: '8964000190035',
    name: '5% 500ML UNI',
    batchNumber: 'UNI-500',
    manufacturer: 'Uni-Pack Healthcare',
    category: 'IV Infusions',
    unit: 'BOTTLE',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 420).toISOString(),
    quantity: -20,
    lowStockThreshold: 20,
    purchasePrice: 90,
    mrp: 125,
    sellingPrice: 110,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-5cc-bio',
    barcode: '8964000190042',
    name: '5CC BIO',
    batchNumber: 'BIO-5C',
    manufacturer: 'Bio-Care Surgical',
    category: 'Syringes',
    unit: 'PCS',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 480).toISOString(),
    quantity: -2,
    lowStockThreshold: 20,
    purchasePrice: 9.5,
    mrp: 15,
    sellingPrice: 14,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-blue-tex',
    barcode: '8964000190059',
    name: 'BLUE TEX PAD',
    batchNumber: 'BTP-901',
    manufacturer: 'Surgical Care Pakistan',
    category: 'Surgical Items',
    unit: 'PCS',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 600).toISOString(),
    quantity: 120,
    lowStockThreshold: 20,
    purchasePrice: 67.00,
    mrp: 100.00,
    sellingPrice: 0.00,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-bp-pump',
    barcode: '8964000190066',
    name: 'BP PUMP MEDIPLUS',
    batchNumber: 'BPP-40',
    manufacturer: 'MediPlus Health',
    category: 'Diagnostic Devices',
    unit: 'SET',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 700).toISOString(),
    quantity: -6,
    lowStockThreshold: 10,
    purchasePrice: 850,
    mrp: 1300,
    sellingPrice: 1200,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-bp-set',
    barcode: '8964000190073',
    name: 'BP SET MEDIPLUS',
    batchNumber: 'BPS-88',
    manufacturer: 'MediPlus Health',
    category: 'Diagnostic Devices',
    unit: 'SET',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 720).toISOString(),
    quantity: -2,
    lowStockThreshold: 5,
    purchasePrice: 1800,
    mrp: 2600,
    sellingPrice: 2400,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-bp-watch',
    barcode: '8964000190080',
    name: 'BP WATCH',
    batchNumber: 'BPW-12',
    manufacturer: 'MediPlus Health',
    category: 'Diagnostic Devices',
    unit: 'PCS',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 750).toISOString(),
    quantity: -2,
    lowStockThreshold: 5,
    purchasePrice: 950,
    mrp: 1500,
    sellingPrice: 1350,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-01',
    barcode: '8964000120011',
    name: 'Panadol 500mg Tablets',
    batchNumber: 'PAN-882',
    manufacturer: 'GlaxoSmithKline (GSK)',
    category: 'General Medicines',
    unit: 'STRIP',
    genericId: 'gen-paracetamol',
    genericName: 'Paracetamol',
    strength: '500mg',
    dosageForm: 'Tablet',
    isControlled: false,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    quantity: 450,
    lowStockThreshold: 50,
    purchasePrice: 380,
    mrp: 480,
    sellingPrice: 420,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-02',
    barcode: '8964000120028',
    name: 'Augmentin 625mg Tablets',
    batchNumber: 'AUG-904',
    manufacturer: 'GlaxoSmithKline (GSK)',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 280).toISOString(),
    quantity: 120,
    lowStockThreshold: 25,
    purchasePrice: 280,
    mrp: 350,
    sellingPrice: 310,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-03',
    barcode: '8964000120035',
    name: 'Disprin 300mg Tablets',
    batchNumber: 'DSP-412',
    manufacturer: 'Reckitt Benckiser',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 400).toISOString(),
    quantity: 300,
    lowStockThreshold: 40,
    purchasePrice: 170,
    mrp: 230,
    sellingPrice: 195,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-04',
    barcode: '8964000120042',
    name: 'Flagyl 400mg Tablets',
    batchNumber: 'FLG-713',
    manufacturer: 'Sanofi-Aventis',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 320).toISOString(),
    quantity: 220,
    lowStockThreshold: 30,
    purchasePrice: 330,
    mrp: 420,
    sellingPrice: 370,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-05',
    barcode: '8964000120059',
    name: 'Brufen 400mg Tablets',
    batchNumber: 'BRF-609',
    manufacturer: 'Abbott Laboratories',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 340).toISOString(),
    quantity: 180,
    lowStockThreshold: 30,
    purchasePrice: 460,
    mrp: 580,
    sellingPrice: 510,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-06',
    barcode: '8964000120066',
    name: 'Risek 20mg Capsules',
    batchNumber: 'RSK-311',
    manufacturer: 'Getz Pharma',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 300).toISOString(),
    quantity: 95,
    lowStockThreshold: 20,
    purchasePrice: 260,
    mrp: 330,
    sellingPrice: 290,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-07',
    barcode: '8964000120073',
    name: 'Arinac Forte Tablets',
    batchNumber: 'ARN-505',
    manufacturer: 'Abbott Laboratories',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 250).toISOString(),
    quantity: 140,
    lowStockThreshold: 25,
    purchasePrice: 340,
    mrp: 430,
    sellingPrice: 380,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-08',
    barcode: '8964000120080',
    name: 'Gravinate 50mg Tablets',
    batchNumber: 'GRV-220',
    manufacturer: 'Searle Company',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 290).toISOString(),
    quantity: 200,
    lowStockThreshold: 30,
    purchasePrice: 200,
    mrp: 270,
    sellingPrice: 230,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-09',
    barcode: '8964000120097',
    name: 'Ponstan Forte 500mg',
    batchNumber: 'PST-118',
    manufacturer: 'Pfizer Pakistan',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 380).toISOString(),
    quantity: 160,
    lowStockThreshold: 30,
    purchasePrice: 500,
    mrp: 630,
    sellingPrice: 550,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-10',
    barcode: '8964000120103',
    name: 'Surbex-Z High Potency Tablets',
    batchNumber: 'SBZ-704',
    manufacturer: 'Abbott Laboratories',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 420).toISOString(),
    quantity: 85,
    lowStockThreshold: 20,
    purchasePrice: 300,
    mrp: 385,
    sellingPrice: 340,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-11',
    barcode: '8964000120110',
    name: 'Cac-1000 Plus Orange Effervescent',
    batchNumber: 'CAC-921',
    manufacturer: 'GlaxoSmithKline (GSK)',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 210).toISOString(),
    quantity: 110,
    lowStockThreshold: 25,
    purchasePrice: 230,
    mrp: 300,
    sellingPrice: 260,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-12',
    barcode: '8964000120127',
    name: 'Klaricid 250mg Suspension 60ml',
    batchNumber: 'KLR-403',
    manufacturer: 'Abbott Laboratories',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
    quantity: 45,
    lowStockThreshold: 15,
    purchasePrice: 420,
    mrp: 530,
    sellingPrice: 470,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-13',
    barcode: '8964000120134',
    name: 'Citaro 10mg Tablets',
    batchNumber: 'CTR-881',
    manufacturer: 'Hilton Pharma',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 310).toISOString(),
    quantity: 70,
    lowStockThreshold: 20,
    purchasePrice: 270,
    mrp: 350,
    sellingPrice: 305,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-14',
    barcode: '8964000120141',
    name: 'Xb 20mg Tablets',
    batchNumber: 'XBB-109',
    manufacturer: 'Bosch Pharmaceuticals',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 260).toISOString(),
    quantity: 60,
    lowStockThreshold: 15,
    purchasePrice: 300,
    mrp: 390,
    sellingPrice: 340,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-15',
    barcode: '8964000120158',
    name: 'Flyp 500ml IV Infusion',
    batchNumber: 'FLP-650',
    manufacturer: 'UniPharma Laboratories',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 200).toISOString(),
    quantity: 12,
    lowStockThreshold: 25,
    purchasePrice: 85,
    mrp: 120,
    sellingPrice: 100,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-16',
    barcode: '8964000120165',
    name: '5% Dextrose Water 1000ml UNI',
    batchNumber: 'DXT-100',
    manufacturer: 'Uni-Pack Healthcare',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 190).toISOString(),
    quantity: 5,
    lowStockThreshold: 20,
    purchasePrice: 120,
    mrp: 165,
    sellingPrice: 140,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-17',
    barcode: '8964000120172',
    name: '5% Dextrose Saline 500ml UNI',
    batchNumber: 'DXS-500',
    manufacturer: 'Uni-Pack Healthcare',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 220).toISOString(),
    quantity: 8,
    lowStockThreshold: 20,
    purchasePrice: 90,
    mrp: 130,
    sellingPrice: 110,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-18',
    barcode: '8964000120189',
    name: '0.9% Normal Saline 1000ml Infusion',
    batchNumber: 'NS-1004',
    manufacturer: 'Otsuka Pakistan',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 330).toISOString(),
    quantity: 25,
    lowStockThreshold: 30,
    purchasePrice: 115,
    mrp: 155,
    sellingPrice: 135,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-19',
    barcode: '8964000120196',
    name: '10CC Bio Disposable Syringes',
    batchNumber: 'SYR-10CC',
    manufacturer: 'Bio-Care Surgical',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 500).toISOString(),
    quantity: 10,
    lowStockThreshold: 50,
    purchasePrice: 1300,
    mrp: 1700,
    sellingPrice: 1500,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-20',
    barcode: '8964000120202',
    name: '5CC Disposable Syringes (Pack of 100)',
    batchNumber: 'SYR-5CC',
    manufacturer: 'Master Care Surgicals',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 480).toISOString(),
    quantity: 45,
    lowStockThreshold: 20,
    purchasePrice: 950,
    mrp: 1250,
    sellingPrice: 1100,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-21',
    barcode: '8964000120219',
    name: '3CC Disposable Syringes (Pack of 100)',
    batchNumber: 'SYR-3CC',
    manufacturer: 'MediPlus Surgicals',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 460).toISOString(),
    quantity: 60,
    lowStockThreshold: 20,
    purchasePrice: 850,
    mrp: 1150,
    sellingPrice: 980,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-22',
    barcode: '8964000120226',
    name: 'Blue Tex Cotton Pad 100g',
    batchNumber: 'BTX-100',
    manufacturer: 'Surgical Plus Pakistan',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 600).toISOString(),
    quantity: 40,
    lowStockThreshold: 15,
    purchasePrice: 180,
    mrp: 250,
    sellingPrice: 215,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-23',
    barcode: '8964000120233',
    name: 'Surgical Cotton Roll 500g',
    batchNumber: 'CTR-500',
    manufacturer: 'Pakistan Surgical Co',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 550).toISOString(),
    quantity: 35,
    lowStockThreshold: 15,
    purchasePrice: 420,
    mrp: 580,
    sellingPrice: 490,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-24',
    barcode: '8964000120240',
    name: 'Crepe Bandage 4 Inch Elastic',
    batchNumber: 'CRB-4IN',
    manufacturer: 'CareBand Medical',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 500).toISOString(),
    quantity: 75,
    lowStockThreshold: 20,
    purchasePrice: 65,
    mrp: 95,
    sellingPrice: 80,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-25',
    barcode: '8964000120257',
    name: 'Adhesive Plaster Surgical Tape 1" x 5yd',
    batchNumber: 'STP-1IN',
    manufacturer: 'SurgiTape Industries',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 450).toISOString(),
    quantity: 60,
    lowStockThreshold: 15,
    purchasePrice: 110,
    mrp: 160,
    sellingPrice: 135,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-26',
    barcode: '8964000120264',
    name: 'IV Cannula 20G Pink (with port)',
    batchNumber: 'CAN-20G',
    manufacturer: 'SafetyMed Instruments',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 400).toISOString(),
    quantity: 90,
    lowStockThreshold: 25,
    purchasePrice: 55,
    mrp: 85,
    sellingPrice: 70,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-27',
    barcode: '8964000120271',
    name: 'IV Cannula 22G Blue (with port)',
    batchNumber: 'CAN-22G',
    manufacturer: 'SafetyMed Instruments',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 400).toISOString(),
    quantity: 80,
    lowStockThreshold: 25,
    purchasePrice: 55,
    mrp: 85,
    sellingPrice: 70,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-28',
    barcode: '8964000120288',
    name: 'Pyodine Antiseptic Solution 10% 450ml',
    batchNumber: 'PYD-450',
    manufacturer: 'Brookes Pharma',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 350).toISOString(),
    quantity: 40,
    lowStockThreshold: 15,
    purchasePrice: 360,
    mrp: 460,
    sellingPrice: 410,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-29',
    barcode: '8964000120295',
    name: 'Surgical Latex Examination Gloves (M - Box of 100)',
    batchNumber: 'GLV-100M',
    manufacturer: 'GlovoMed Surgical',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 480).toISOString(),
    quantity: 55,
    lowStockThreshold: 15,
    purchasePrice: 850,
    mrp: 1150,
    sellingPrice: 990,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-30',
    barcode: '8964000120301',
    name: 'Face Mask 3-Ply Surgical Earloop (Box of 50)',
    batchNumber: 'MSK-50P',
    manufacturer: 'SurgiGuard Medical',
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 500).toISOString(),
    quantity: 120,
    lowStockThreshold: 30,
    purchasePrice: 220,
    mrp: 320,
    sellingPrice: 270,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-calpol-500',
    barcode: '8964000120501',
    name: 'Calpol 500mg Tablets',
    batchNumber: 'CAL-312',
    manufacturer: 'GlaxoSmithKline (GSK)',
    category: 'General Medicines',
    unit: 'STRIP',
    genericId: 'gen-paracetamol',
    genericName: 'Paracetamol',
    strength: '500mg',
    dosageForm: 'Tablet',
    isControlled: false,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 400).toISOString(),
    quantity: 320,
    lowStockThreshold: 40,
    purchasePrice: 390,
    mrp: 490,
    sellingPrice: 430,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-febrol-500',
    barcode: '8964000120502',
    name: 'Febrol 500mg Tablets',
    batchNumber: 'FEB-890',
    manufacturer: 'Searle Company',
    category: 'General Medicines',
    unit: 'STRIP',
    genericId: 'gen-paracetamol',
    genericName: 'Paracetamol',
    strength: '500mg',
    dosageForm: 'Tablet',
    isControlled: false,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 450).toISOString(),
    quantity: 210,
    lowStockThreshold: 30,
    purchasePrice: 375,
    mrp: 470,
    sellingPrice: 415,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-valium-10',
    barcode: '8964000120601',
    name: 'Valium 10mg Tablets (Diazepam)',
    batchNumber: 'VAL-091',
    manufacturer: 'Roche Pakistan',
    category: 'Controlled / Narcotics',
    unit: 'STRIP',
    genericId: 'gen-diazepam',
    genericName: 'Diazepam',
    strength: '10mg',
    dosageForm: 'Tablet',
    isControlled: true,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 320).toISOString(),
    quantity: 45,
    lowStockThreshold: 10,
    purchasePrice: 580,
    mrp: 750,
    sellingPrice: 690,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-xanax-05',
    barcode: '8964000120602',
    name: 'Xanax 0.5mg Tablets (Alprazolam)',
    batchNumber: 'XNX-441',
    manufacturer: 'Pfizer Pakistan',
    category: 'Controlled / Narcotics',
    unit: 'STRIP',
    genericId: 'gen-alprazolam',
    genericName: 'Alprazolam',
    strength: '0.5mg',
    dosageForm: 'Tablet',
    isControlled: true,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 290).toISOString(),
    quantity: 60,
    lowStockThreshold: 15,
    purchasePrice: 490,
    mrp: 640,
    sellingPrice: 580,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-tramal-50',
    barcode: '8964000120603',
    name: 'Tramal 50mg Capsules (Tramadol)',
    batchNumber: 'TRM-719',
    manufacturer: 'Searle Company',
    category: 'Controlled / Narcotics',
    unit: 'STRIP',
    genericId: 'gen-tramadol',
    genericName: 'Tramadol HCl',
    strength: '50mg',
    dosageForm: 'Capsule',
    isControlled: true,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 380).toISOString(),
    quantity: 80,
    lowStockThreshold: 20,
    purchasePrice: 620,
    mrp: 810,
    sellingPrice: 740,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'med-lyrica-75',
    barcode: '8964000120604',
    name: 'Lyrica 75mg Capsules (Pregabalin)',
    batchNumber: 'LYR-105',
    manufacturer: 'Pfizer Pakistan',
    category: 'Controlled / Narcotics',
    unit: 'STRIP',
    genericId: 'gen-pregabalin',
    genericName: 'Pregabalin',
    strength: '75mg',
    dosageForm: 'Capsule',
    isControlled: true,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 420).toISOString(),
    quantity: 50,
    lowStockThreshold: 10,
    purchasePrice: 1200,
    mrp: 1550,
    sellingPrice: 1400,
    gstPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const DUMMY_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-01',
    name: 'IMRAN PRESIDENT SURGICALS',
    contactPerson: 'Imran Ashraf',
    phone: '0321-6549608',
    email: 'imran@presidentsurgicals.pk',
    address: 'Katchery Road, Sargodha',
    paymentTerms: 'Net 15',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup-02',
    name: 'GSK & ABBOTT PHARMA DISTRIBUTORS',
    contactPerson: 'Shahid Mehmood',
    phone: '0300-8765432',
    email: 'sales@gskdistributors.pk',
    address: 'Medicine Market, Faisalabad',
    paymentTerms: 'Net 30',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup-03',
    name: 'MEDI SUPPLY & SURGICAL CO',
    contactPerson: 'Rana Tariq',
    phone: '0333-5544332',
    email: 'tariq@medisupply.pk',
    address: 'Circular Road, Lahore',
    paymentTerms: 'Due on Receipt',
    createdAt: new Date().toISOString()
  }
];

export const DUMMY_CUSTOMERS: Party[] = [
  {
    id: 'cust-01',
    name: 'DR SHAHIDA CLINIC SILANWALI',
    partyType: 'Customer',
    contactPerson: 'Dr. Shahida',
    phone: '0301-7890123',
    email: 'drshahida@gmail.com',
    address: 'Main Bazar, Silanwali',
    city: 'Silanwali',
    paymentTerms: 'Net 15',
    openingBalance: 0,
    creditLimit: 100000,
    balance: 7400,
    taxNumber: 'PK-492019-1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-02',
    name: 'NOOR PHARMACY SILANWALI',
    partyType: 'Customer',
    contactPerson: 'Muhammad Noor',
    phone: '0300-6543210',
    email: 'noorpharmacy@gmail.com',
    address: 'Katchery Road, Silanwali',
    city: 'Silanwali',
    paymentTerms: 'Net 30',
    openingBalance: 0,
    creditLimit: 150000,
    balance: 9000,
    taxNumber: 'PK-384910-2',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-03',
    name: 'PAKISTAN PHARMACY CHOKERA',
    partyType: 'Customer',
    contactPerson: 'Zahid Hussain',
    phone: '0345-9871234',
    email: 'pakpharma.chokera@gmail.com',
    address: 'Chokera Morr, Kot Momin Road',
    city: 'Kot Momin',
    paymentTerms: 'Net 15',
    openingBalance: 0,
    creditLimit: 200000,
    balance: 18430,
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-04',
    name: 'SALEEM PHARMACY SILANWALI',
    partyType: 'Customer',
    contactPerson: 'Saleem Akhtar',
    phone: '0321-4567890',
    email: 'saleempharmacy@gmail.com',
    address: 'Opposite THQ Hospital, Silanwali',
    city: 'Silanwali',
    paymentTerms: 'Net 30',
    openingBalance: 0,
    creditLimit: 250000,
    balance: 109040,
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-05',
    name: 'ADAM CLINIC MOZAMABAAD',
    partyType: 'Customer',
    contactPerson: 'Dr. Adam Khan',
    phone: '0313-1122334',
    email: 'adamclinic@gmail.com',
    address: 'Mozamabad, Sargodha Road',
    city: 'Sargodha',
    paymentTerms: 'Cash',
    openingBalance: 0,
    creditLimit: 50000,
    balance: 2500,
    createdAt: new Date().toISOString()
  }
];

export const forceSeedDemoProducts = async () => {
  // Clear or save all 30 dummy medicines
  for (const m of DUMMY_MEDICINES) {
    await dbMedicines.save(m);
  }
  for (const s of DUMMY_SUPPLIERS) {
    await dbSuppliers.save(s);
  }
  for (const c of DUMMY_CUSTOMERS) {
    await dbSuppliers.save(c as any);
  }

  // Seed purchase order for BLUE TEX PAD and other surgical items from IMRAN PRESIDENT
  const poBlueTex: PurchaseOrder = {
    id: 'po-blue-tex-1',
    poNumber: '1',
    billNumber: '1',
    supplierId: 'sup-01',
    supplierName: 'IMRAN PRESIDENT',
    partyName: 'IMRAN PRESIDENT',
    date: '2026-09-06T10:00:00.000Z',
    paymentType: 'Cash',
    items: [
      { medicineId: 'med-blue-tex', name: 'BLUE TEX PAD', quantity: 120, unit: 'BOX', purchasePrice: 67.00, total: 8040.00 },
      { medicineId: 'med-23', name: 'Surgical Cotton Roll 500g', quantity: 20, unit: 'ROLL', purchasePrice: 420.00, total: 8400.00 },
      { medicineId: 'med-24', name: 'Crepe Bandage 4 Inch Elastic', quantity: 100, unit: 'PCS', purchasePrice: 50.00, total: 5000.00 }
    ],
    subTotal: 21440.00,
    totalAmount: 21440.00,
    paidAmount: 640.00,
    balanceDue: 20800.00,
    status: 'Partial',
    transactionType: 'Purchase'
  };
  await dbPurchaseOrders.save(poBlueTex);

  return DUMMY_MEDICINES.length;
};

export const generateSeedData = async () => {
  const currentMedicines = await dbMedicines.getAll();

  // Seed Medicines if less than 20
  if (currentMedicines.length < 20) {
    for (const m of DUMMY_MEDICINES) {
      await dbMedicines.save(m);
    }
  }

  // Seed Suppliers & Customers
  for (const s of DUMMY_SUPPLIERS) {
    await dbSuppliers.save(s);
  }
  for (const c of DUMMY_CUSTOMERS) {
    await dbSuppliers.save(c as any);
  }

  // Seed Transactions for all Sale Submenus
  const currentInvoices = await dbInvoices.getAll();
  if (currentInvoices.length === 0) {
    const sampleInvoices: Invoice[] = [
      // 1. Sale Invoices
      {
        id: 'inv-seed-1',
        invoiceNumber: '5',
        date: '2026-09-06T10:30:00.000Z',
        customerName: 'DR SHAHIDA CLINIC SILANWALI',
        billingName: 'Dr Shahida Clinic',
        customerPhone: '0301-7890123',
        customerAddress: 'Main Bazar, Silanwali',
        transactionType: 'Sale',
        paymentType: 'Cash',
        items: [
          {
            medicineId: 'med-26',
            name: 'IV Cannula 20G Pink (with port)',
            batchNumber: 'CAN-20G',
            quantity: 20,
            unit: 'Box',
            pricePerUnit: 370,
            sellingPrice: 370,
            mrp: 410,
            total: 7400
          }
        ],
        subTotal: 7400,
        grandTotal: 7400,
        receivedAmount: 0,
        balanceDue: 7400,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-06T10:30:00.000Z'
      },
      {
        id: 'inv-seed-2',
        invoiceNumber: '4',
        date: '2026-09-06T09:15:00.000Z',
        customerName: 'NOOR PHARMACY SILANWALI',
        billingName: 'Noor Pharmacy',
        customerPhone: '0300-6543210',
        customerAddress: 'Katchery Road, Silanwali',
        transactionType: 'Sale',
        paymentType: 'Cash',
        items: [
          {
            medicineId: 'med-29',
            name: 'Surgical Latex Examination Gloves (M - Box of 100)',
            batchNumber: 'GLV-100M',
            quantity: 15,
            unit: 'Box',
            pricePerUnit: 600,
            sellingPrice: 600,
            mrp: 650,
            total: 9000
          }
        ],
        subTotal: 9000,
        grandTotal: 9000,
        receivedAmount: 0,
        balanceDue: 9000,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-06T09:15:00.000Z'
      },
      {
        id: 'inv-seed-3',
        invoiceNumber: '3',
        date: '2026-09-06T08:00:00.000Z',
        customerName: 'PAKISTAN PHARMACY CHOKI...',
        billingName: 'Pakistan Pharmacy Chokera',
        customerPhone: '0345-9871234',
        customerAddress: 'Chokera Morr, Kot Momin Road',
        transactionType: 'Sale',
        paymentType: 'Cash',
        items: [
          {
            medicineId: 'med-27',
            name: 'IV Cannula 22G Blue (with port)',
            batchNumber: 'CAN-22G',
            quantity: 10,
            unit: 'Box',
            pricePerUnit: 1843,
            sellingPrice: 1843,
            mrp: 2000,
            total: 18430
          }
        ],
        subTotal: 18430,
        grandTotal: 18430,
        receivedAmount: 0,
        balanceDue: 18430,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-06T08:00:00.000Z'
      },
      {
        id: 'inv-seed-4',
        invoiceNumber: '2',
        date: '2026-09-02T14:20:00.000Z',
        customerName: 'SALEEM PHARMACY SILAWALI',
        billingName: 'Saleem Pharmacy',
        customerPhone: '0321-4567890',
        customerAddress: 'Opposite THQ Hospital, Silanwali',
        transactionType: 'Sale',
        paymentType: 'Cash',
        items: [
          {
            medicineId: 'med-19',
            name: '10CC Bio Disposable Syringes',
            batchNumber: 'SYR-10CC',
            quantity: 20,
            unit: 'Box',
            pricePerUnit: 5452,
            sellingPrice: 5452,
            mrp: 6000,
            total: 109040
          }
        ],
        subTotal: 109040,
        grandTotal: 109040,
        receivedAmount: 0,
        balanceDue: 109040,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-02T14:20:00.000Z'
      },
      {
        id: 'inv-seed-5',
        invoiceNumber: '1',
        date: '2026-09-01T11:00:00.000Z',
        customerName: 'ADAM CLINIC MOZAMABAAD',
        billingName: 'Adam Clinic',
        customerPhone: '0313-1122334',
        customerAddress: 'Mozamabad, Sargodha Road',
        transactionType: 'Sale',
        paymentType: 'Cash',
        items: [
          {
            medicineId: 'med-24',
            name: 'Crepe Bandage 4 Inch Elastic',
            batchNumber: 'CRB-4IN',
            quantity: 50,
            unit: 'Pcs',
            pricePerUnit: 50,
            sellingPrice: 50,
            mrp: 60,
            total: 2500
          }
        ],
        subTotal: 2500,
        grandTotal: 2500,
        receivedAmount: 0,
        balanceDue: 2500,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-01T11:00:00.000Z'
      },

      // 2. Estimates / Quotations
      {
        id: 'est-seed-1',
        invoiceNumber: 'EST-101',
        date: '2026-09-08T11:00:00.000Z',
        validUntil: '2026-09-25',
        status: 'Pending',
        customerName: 'FATIMA MEMORIAL HOSPITAL',
        billingName: 'Fatima Memorial Hospital',
        customerPhone: '0302-3344556',
        customerAddress: 'Medical Complex Road, Sargodha',
        transactionType: 'Estimate',
        paymentType: 'Credit',
        items: [
          {
            medicineId: 'med-29',
            name: 'Surgical Latex Examination Gloves (M - Box of 100)',
            batchNumber: 'GLV-100M',
            quantity: 50,
            unit: 'Box',
            pricePerUnit: 950,
            sellingPrice: 950,
            mrp: 1150,
            total: 47500
          },
          {
            medicineId: 'med-30',
            name: 'Face Mask 3-Ply Surgical Earloop (Box of 50)',
            batchNumber: 'MSK-50P',
            quantity: 40,
            unit: 'Box',
            pricePerUnit: 250,
            sellingPrice: 250,
            mrp: 320,
            total: 10000
          }
        ],
        subTotal: 57500,
        grandTotal: 57500,
        receivedAmount: 0,
        balanceDue: 57500,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-08T11:00:00.000Z'
      },
      {
        id: 'est-seed-2',
        invoiceNumber: 'EST-102',
        date: '2026-09-09T14:30:00.000Z',
        validUntil: '2026-09-30',
        status: 'Converted',
        customerName: 'CITY MEDICAL CLINIC SILANWALI',
        billingName: 'City Medical Clinic',
        customerPhone: '0305-6677889',
        customerAddress: 'Railway Road, Silanwali',
        transactionType: 'Estimate',
        paymentType: 'Cash',
        items: [
          {
            medicineId: 'med-28',
            name: 'Pyodine Antiseptic Solution 10% 450ml',
            batchNumber: 'PYD-450',
            quantity: 10,
            unit: 'Bottle',
            pricePerUnit: 400,
            sellingPrice: 400,
            mrp: 460,
            total: 4000
          }
        ],
        subTotal: 4000,
        grandTotal: 4000,
        receivedAmount: 4000,
        balanceDue: 0,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-09T14:30:00.000Z'
      },

      // 3. Sale Orders
      {
        id: 'so-seed-1',
        invoiceNumber: 'SO-201',
        date: '2026-09-07T12:00:00.000Z',
        deliveryDueDate: '2026-09-15',
        status: 'Pending',
        customerName: 'THQ HOSPITAL SILANWALI',
        billingName: 'THQ Hospital Silanwali',
        customerPhone: '048-654321',
        customerAddress: 'Hospital Road, Silanwali',
        transactionType: 'Sale Order',
        paymentType: 'Credit',
        items: [
          {
            medicineId: 'med-18',
            name: '0.9% Normal Saline 1000ml Infusion',
            batchNumber: 'NS-1004',
            quantity: 100,
            unit: 'Bottle',
            pricePerUnit: 130,
            sellingPrice: 130,
            mrp: 155,
            total: 13000
          },
          {
            medicineId: 'med-26',
            name: 'IV Cannula 20G Pink (with port)',
            batchNumber: 'CAN-20G',
            quantity: 60,
            unit: 'Box',
            pricePerUnit: 68,
            sellingPrice: 68,
            mrp: 85,
            total: 4080
          }
        ],
        subTotal: 17080,
        grandTotal: 17080,
        receivedAmount: 5000,
        balanceDue: 12080,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-07T12:00:00.000Z'
      },

      // 4. Delivery Challans
      {
        id: 'dc-seed-1',
        invoiceNumber: 'DC-301',
        date: '2026-09-09T09:00:00.000Z',
        vehicleNumber: 'SGA-7821 (Suzuki Carry)',
        driverName: 'Muhammad Tariq (0300-1122445)',
        status: 'Dispatched',
        customerName: 'DR SHAHIDA CLINIC SILANWALI',
        billingName: 'Dr Shahida Clinic',
        customerPhone: '0301-7890123',
        customerAddress: 'Main Bazar, Silanwali',
        transactionType: 'Delivery Challan',
        paymentType: 'Credit',
        items: [
          {
            medicineId: 'med-23',
            name: 'Surgical Cotton Roll 500g',
            batchNumber: 'CTR-500',
            quantity: 10,
            unit: 'Roll',
            pricePerUnit: 490,
            sellingPrice: 490,
            mrp: 580,
            total: 4900
          },
          {
            medicineId: 'med-25',
            name: 'Adhesive Plaster Surgical Tape 1" x 5yd',
            batchNumber: 'STP-1IN',
            quantity: 20,
            unit: 'Pcs',
            pricePerUnit: 135,
            sellingPrice: 135,
            mrp: 160,
            total: 2700
          }
        ],
        subTotal: 7600,
        grandTotal: 7600,
        receivedAmount: 0,
        balanceDue: 7600,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-09T09:00:00.000Z'
      },

      // 5. Sale Returns / Credit Notes
      {
        id: 'sr-seed-1',
        invoiceNumber: 'SR-401',
        originalInvoiceNumber: '2',
        returnReason: 'Damaged packaging during transit',
        status: 'Completed',
        date: '2026-09-05T16:00:00.000Z',
        customerName: 'SALEEM PHARMACY SILAWALI',
        billingName: 'Saleem Pharmacy',
        customerPhone: '0321-4567890',
        customerAddress: 'Opposite THQ Hospital, Silanwali',
        transactionType: 'Sale Return',
        paymentType: 'Credit',
        items: [
          {
            medicineId: 'med-19',
            name: '10CC Bio Disposable Syringes',
            batchNumber: 'SYR-10CC',
            quantity: 2,
            unit: 'Box',
            pricePerUnit: 5452,
            sellingPrice: 5452,
            mrp: 6000,
            total: 10904
          }
        ],
        subTotal: 10904,
        grandTotal: 10904,
        receivedAmount: 10904,
        balanceDue: 0,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-05T16:00:00.000Z'
      },
      // 5. Special Controlled Sales (Form-7 Registered)
      {
        id: 'inv-ctrl-seed-1',
        invoiceNumber: 'CTRL-9001',
        date: '2026-09-10T11:45:00.000Z',
        customerName: 'Muhammad Tariq Khan',
        billingName: 'Muhammad Tariq Khan',
        customerPhone: '0300-9876543',
        customerAddress: 'House 42, Block B, Satellite Town, Sargodha',
        transactionType: 'Sale',
        paymentType: 'Cash',
        isControlledSale: true,
        patientName: 'Muhammad Tariq Khan',
        patientCnicOrPhone: '38403-1948271-3',
        patientAge: '46 Yrs',
        patientGender: 'Male',
        patientAddress: 'House 42, Block B, Satellite Town, Sargodha',
        patientDiagnosis: 'Severe Generalized Anxiety Disorder & Insomnia',
        prescriberDoctorName: 'Dr. Aftab Ahmad Cheema',
        prescriberDoctorRegNo: 'PMDC-48291-P',
        prescriberHospitalOrClinic: 'DHQ Teaching Hospital, Sargodha',
        prescriberContact: '0321-7788990',
        prescriptionNumber: 'RX-DHQ-88219',
        prescriptionDate: '2026-09-10',
        controlledApprovalBy: 'Senior Pharmacist (Admin)',
        items: [
          {
            medicineId: 'med-xanax-05',
            name: 'Xanax 0.5mg Tablets (Alprazolam)',
            genericName: 'Alprazolam',
            genericId: 'gen-alprazolam',
            strength: '0.5mg',
            dosageForm: 'Tablet',
            manufacturer: 'Pfizer Pakistan',
            isControlled: true,
            batchNumber: 'XNX-441',
            expiryDate: '2027-06-30',
            quantity: 30,
            unit: 'STRIP',
            pricePerUnit: 580,
            sellingPrice: 580,
            mrp: 640,
            total: 17400
          }
        ],
        subTotal: 17400,
        grandTotal: 17400,
        receivedAmount: 17400,
        balanceDue: 0,
        firmName: 'MBI INVENTRA',
        userName: 'Pharmacist',
        createdAt: '2026-09-10T11:45:00.000Z'
      },
      {
        id: 'inv-ctrl-seed-2',
        invoiceNumber: 'CTRL-9002',
        date: '2026-09-11T16:20:00.000Z',
        customerName: 'Mrs. Zahida Parveen',
        billingName: 'Mrs. Zahida Parveen',
        customerPhone: '0312-5544332',
        customerAddress: 'Silanwali Road, Sargodha',
        transactionType: 'Sale',
        paymentType: 'Cash',
        isControlledSale: true,
        patientName: 'Mrs. Zahida Parveen',
        patientCnicOrPhone: '38402-8819203-4',
        patientAge: '58 Yrs',
        patientGender: 'Female',
        patientAddress: 'Silanwali Road, Sargodha',
        patientDiagnosis: 'Diabetic Peripheral Neuropathic Pain',
        prescriberDoctorName: 'Dr. Shahbaz Hussain Malik',
        prescriberDoctorRegNo: 'PMDC-31049-M',
        prescriberHospitalOrClinic: 'Malik Neuro-Spine Clinic, Sargodha',
        prescriberContact: '0300-1122334',
        prescriptionNumber: 'RX-MNC-44021',
        prescriptionDate: '2026-09-11',
        controlledApprovalBy: 'Chief Pharmacist',
        items: [
          {
            medicineId: 'med-lyrica-75',
            name: 'Lyrica 75mg Capsules (Pregabalin)',
            genericName: 'Pregabalin',
            genericId: 'gen-pregabalin',
            strength: '75mg',
            dosageForm: 'Capsule',
            manufacturer: 'Pfizer Pakistan',
            isControlled: true,
            batchNumber: 'LYR-105',
            expiryDate: '2027-10-31',
            quantity: 14,
            unit: 'STRIP',
            pricePerUnit: 1400,
            sellingPrice: 1400,
            mrp: 1550,
            total: 19600
          },
          {
            medicineId: 'med-tramal-50',
            name: 'Tramal 50mg Capsules (Tramadol)',
            genericName: 'Tramadol HCl',
            genericId: 'gen-tramadol',
            strength: '50mg',
            dosageForm: 'Capsule',
            manufacturer: 'Searle Company',
            isControlled: true,
            batchNumber: 'TRM-719',
            expiryDate: '2027-08-31',
            quantity: 10,
            unit: 'STRIP',
            pricePerUnit: 740,
            sellingPrice: 740,
            mrp: 810,
            total: 7400
          }
        ],
        subTotal: 27000,
        grandTotal: 27000,
        receivedAmount: 27000,
        balanceDue: 0,
        firmName: 'MBI INVENTRA',
        userName: 'Admin',
        createdAt: '2026-09-11T16:20:00.000Z'
      }
    ];

    for (const inv of sampleInvoices) {
      await dbInvoices.save(inv);
    }
  }

  // Seed Sample Payments In
  const currentPayments = await dbPartyPayments.getAll();
  if (currentPayments.length === 0) {
    const samplePayments: PartyPayment[] = [
      {
        id: 'pay-seed-1',
        partyId: 'cust-01',
        partyName: 'DR SHAHIDA CLINIC SILANWALI',
        type: 'PAYMENT_IN',
        amount: 5000,
        date: '2026-09-07T10:00:00.000Z',
        paymentMode: 'Cash',
        referenceNumber: 'RCT-1001',
        notes: 'Partial payment against invoice #5',
        createdAt: '2026-09-07T10:00:00.000Z'
      },
      {
        id: 'pay-seed-2',
        partyId: 'cust-02',
        partyName: 'NOOR PHARMACY SILANWALI',
        type: 'PAYMENT_IN',
        amount: 8000,
        date: '2026-09-08T15:30:00.000Z',
        paymentMode: 'Bank Transfer',
        referenceNumber: 'HBL-TXN-88910',
        notes: 'Online transfer via HBL Mobile',
        createdAt: '2026-09-08T15:30:00.000Z'
      },
      {
        id: 'pay-seed-3',
        partyId: 'cust-04',
        partyName: 'SALEEM PHARMACY SILAWALI',
        type: 'PAYMENT_IN',
        amount: 25000,
        date: '2026-09-09T17:00:00.000Z',
        paymentMode: 'Cheque',
        referenceNumber: 'MCB-CHQ-445109',
        notes: 'Account payee cheque clearing',
        createdAt: '2026-09-09T17:00:00.000Z'
      }
    ];

    for (const p of samplePayments) {
      await dbPartyPayments.save(p);
    }
  }

  // Seed Sample Purchase Orders
  const currentPOs = await dbPurchaseOrders.getAll();
  if (currentPOs.length === 0) {
    const samplePO: PurchaseOrder = {
      id: 'po-101',
      poNumber: '1',
      billNumber: '1',
      supplierId: 'sup-01',
      supplierName: 'IMRAN PRESIDENT',
      partyName: 'IMRAN PRESIDENT',
      date: '2026-09-06T10:00:00.000Z',
      paymentType: 'Cash',
      items: [
        { medicineId: 'med-blue-tex', name: 'BLUE TEX PAD', quantity: 120, unit: 'BOX', purchasePrice: 67.00, total: 8040.00 },
        { medicineId: 'med-23', name: 'Surgical Cotton Roll 500g', quantity: 20, unit: 'ROLL', purchasePrice: 420.00, total: 8400.00 },
        { medicineId: 'med-24', name: 'Crepe Bandage 4 Inch Elastic', quantity: 100, unit: 'PCS', purchasePrice: 50.00, total: 5000.00 }
      ],
      subTotal: 21440.00,
      totalAmount: 21440.00,
      paidAmount: 640.00,
      balanceDue: 20800.00,
      status: 'Partial',
      transactionType: 'Purchase'
    };
    await dbPurchaseOrders.save(samplePO);
  }

  // Seed Sample Expenses
  const currentExpenses = await dbExpenses.getAll();
  if (currentExpenses.length === 0) {
    const sampleExpenses: Expense[] = [
      {
        id: 'exp-101',
        expenseNumber: '1',
        category: 'Petrol',
        expenseType: 'Direct Expense',
        amount: 1000,
        subTotal: 1000,
        roundOff: 0,
        paidAmount: 1000,
        balanceDue: 0,
        paymentType: 'Cash',
        partyName: 'PSO Service Station',
        items: [
          { name: 'Petrol for Delivery Bike', quantity: 3.57, pricePerUnit: 280, amount: 1000 }
        ],
        date: '2026-09-11T10:30:00.000Z',
        description: 'Fuel for home delivery bike - morning batch',
        userId: '1',
        createdAt: '2026-09-11T10:30:00.000Z'
      },
      {
        id: 'exp-102',
        expenseNumber: '2',
        category: 'Tea',
        expenseType: 'Direct Expense',
        amount: 360,
        subTotal: 360,
        roundOff: 0,
        paidAmount: 360,
        balanceDue: 0,
        paymentType: 'Cash',
        partyName: 'Umer Tea Stall',
        items: [
          { name: 'Chai & Biscuits for Staff & Customers', quantity: 6, pricePerUnit: 60, amount: 360 }
        ],
        date: '2026-09-10T11:00:00.000Z',
        description: 'Morning and evening tea with bakery biscuits',
        userId: '1',
        createdAt: '2026-09-10T11:00:00.000Z'
      },
      {
        id: 'exp-103',
        expenseNumber: '3',
        category: 'Transport',
        expenseType: 'Direct Expense',
        amount: 650,
        subTotal: 650,
        roundOff: 0,
        paidAmount: 650,
        balanceDue: 0,
        paymentType: 'Cash',
        partyName: 'TCS Cargo',
        items: [
          { name: 'Cartage from Medicine Market', quantity: 1, pricePerUnit: 650, amount: 650 }
        ],
        date: '2026-09-09T14:20:00.000Z',
        description: 'Medicine cartons transport fare from bus terminal',
        userId: '1',
        createdAt: '2026-09-09T14:20:00.000Z'
      },
      {
        id: 'exp-104',
        expenseNumber: '4',
        category: 'Printing & Stationery',
        expenseType: 'Direct Expense',
        amount: 1400,
        subTotal: 1400,
        roundOff: 0,
        paidAmount: 1400,
        balanceDue: 0,
        paymentType: 'Cash',
        partyName: 'Paper King Stationers',
        items: [
          { name: '80mm Thermal Receipt Rolls', quantity: 10, pricePerUnit: 140, amount: 1400 }
        ],
        date: '2026-09-08T16:00:00.000Z',
        description: 'Thermal POS printer rolls for sale billing counter',
        userId: '1',
        createdAt: '2026-09-08T16:00:00.000Z'
      }
    ];

    for (const exp of sampleExpenses) {
      await dbExpenses.save(exp);
    }
  }

  // Seed Sample Bank Accounts
  const currentBanks = await dbBankAccounts.getAll();
  if (currentBanks.length === 0) {
    const meezanBank: BankAccount = {
      id: 'bank-meezan',
      accountDisplayName: 'MEEZAN',
      bankName: 'Meezan Bank Limited',
      accountHolderName: 'MBI INVENTRA',
      accountNumber: '02140103498212',
      ifscCode: 'MEZN0001',
      branchName: 'Medicine Market Branch',
      upiId: '03001234567@raast',
      openingBalance: 0,
      asOfDate: '2026-09-01',
      currentBalance: 0,
      printOnInvoice: true,
      isDefault: true,
      createdAt: '2026-09-01T00:00:00.000Z'
    };

    await dbBankAccounts.save(meezanBank);
  }

  // Seed Sample Users (Matching Sync & Share Screenshot and roles)
  const currentUsers = await dbAppUsers.getAll();
  if (currentUsers.length === 0) {
    const sampleUsers: AppUserRecord[] = [
      {
        id: 'user-arif',
        name: 'ARIF',
        emailOrPhone: 'alhammedmedical@gmail.com',
        role: 'Secondary Admin',
        status: 'Joined',
        passcode: '1234',
        notes: 'Co-admin and branch operations manager',
        lastActive: 'Just now',
        createdAt: '2026-08-15T10:00:00.000Z',
        updatedAt: '2026-09-10T11:30:00.000Z'
      },
      {
        id: 'user-kashif',
        name: 'Kashif Ali',
        emailOrPhone: 'kashif.sales@surgicals.pk',
        role: 'Salesman',
        status: 'Joined',
        passcode: '2345',
        notes: 'Wholesale sales field agent (orders & estimates)',
        lastActive: '10 mins ago',
        createdAt: '2026-08-20T09:00:00.000Z'
      },
      {
        id: 'user-tariq',
        name: 'Tariq Mahmood',
        emailOrPhone: 'tariq.biller@gmail.com',
        role: 'Biller',
        status: 'Joined',
        passcode: '3456',
        notes: 'Front counter POS billing operator',
        lastActive: '25 mins ago',
        createdAt: '2026-08-25T11:00:00.000Z'
      },
      {
        id: 'user-zubair',
        name: 'Muhammad Zubair',
        emailOrPhone: 'zubair.stock@gmail.com',
        role: 'Stock Keeper',
        status: 'Joined',
        passcode: '4567',
        notes: 'Warehouse medicine stock & purchase orders manager',
        lastActive: '1 hour ago',
        createdAt: '2026-08-28T14:00:00.000Z'
      },
      {
        id: 'user-farooq',
        name: 'M. Farooq (CA)',
        emailOrPhone: 'farooq.ca.tax@gmail.com',
        role: 'CA/Accountant',
        status: 'Joined',
        passcode: '5678',
        notes: 'Tax auditor and company chartered accountant',
        lastActive: 'Yesterday',
        createdAt: '2026-09-01T15:00:00.000Z'
      },
      {
        id: 'user-hamza',
        name: 'Hamza Sheikh',
        emailOrPhone: 'hamza.pos@surgicals.pk',
        role: 'Biller and Salesman',
        status: 'Pending',
        passcode: '6789',
        notes: 'New floor salesman and backup biller',
        lastActive: 'Pending invite acceptance',
        createdAt: '2026-09-09T08:00:00.000Z'
      }
    ];

    for (const u of sampleUsers) {
      await dbAppUsers.save(u);
    }
  }

  // Seed Sample User Activity Logs
  const currentLogs = await dbUserActivities.getAll();
  if (currentLogs.length === 0) {
    const sampleLogs: UserActivityLog[] = [
      {
        id: 'act-1',
        userId: 'user-arif',
        userName: 'ARIF',
        userRole: 'Secondary Admin',
        action: 'Created Sale Invoice',
        module: 'Sale',
        details: 'Invoice #1 generated for AL-HAMD MEDICAL STORE (Total: PKR 8,760)',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
      },
      {
        id: 'act-2',
        userId: 'user-zubair',
        userName: 'Muhammad Zubair',
        userRole: 'Stock Keeper',
        action: 'Stock Quantity Update',
        module: 'Inventory',
        details: 'Received batch delivery of 10CC BIO syringes (+500 pcs)',
        timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString()
      },
      {
        id: 'act-3',
        userId: 'user-kashif',
        userName: 'Kashif Ali',
        userRole: 'Salesman',
        action: 'Generated Quotation',
        module: 'Sale',
        details: 'Quotation #QT-104 for BILAL HOSPITAL & MEDICAL COMPLEX',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
      },
      {
        id: 'act-4',
        userId: 'user-tariq',
        userName: 'Tariq Mahmood',
        userRole: 'Biller',
        action: 'Received Cash Payment',
        module: 'Cash & Bank',
        details: 'Collected PKR 12,000 from CITY CARE PHARMACY',
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString()
      },
      {
        id: 'act-5',
        userId: 'user-farooq',
        userName: 'M. Farooq (CA)',
        userRole: 'CA/Accountant',
        action: 'Exported Financial Report',
        module: 'Reports',
        details: 'Generated Profit & Loss Statement and Form 27EQ export for August 2026',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      }
    ];

    for (const log of sampleLogs) {
      await dbUserActivities.save(log);
    }
  }

  // 12. Online Store Initial Seed (Settings, Promos, Orders)
  const existingSettings = await dbStoreSettings.get();
  if (!existingSettings) {
    await dbStoreSettings.save(DEFAULT_STORE_SETTINGS);
  }

  const existingPromos = await dbOnlinePromotions.getAll();
  if (!existingPromos || existingPromos.length === 0) {
    for (const promo of DEFAULT_PROMOTIONS) {
      await dbOnlinePromotions.save(promo);
    }
  }

  const existingOrders = await dbOnlineOrders.getAll();
  if (!existingOrders || existingOrders.length === 0) {
    const sampleOnlineOrders: OnlineOrder[] = [
      {
        id: 'ord-1001',
        orderNumber: 'ORD-2026-1001',
        orderDate: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        customer: {
          name: 'Dr. Shahzad Rafiq',
          phone: '0300-8451234',
          email: 'shahzad.rafiq@gmail.com',
          address: 'House 42-B, Sector F-8/3',
          city: 'Islamabad',
          areaOrLandmark: 'Near Margalla Towers',
          notes: 'Please pack in sterile cold box for insulin.'
        },
        items: [
          {
            medicineId: 'med-01',
            name: 'Panadol 500mg Tablets',
            category: 'General Medicines',
            unit: 'STRIP',
            quantity: 3,
            price: 420,
            compareAtPrice: 480,
            total: 1260
          },
          {
            medicineId: 'med-bp-pump',
            name: 'BP PUMP MEDIPLUS',
            category: 'Diagnostic Devices',
            unit: 'SET',
            quantity: 1,
            price: 1200,
            compareAtPrice: 1300,
            total: 1200
          }
        ],
        subTotal: 2460,
        discountAmount: 246,
        couponCode: 'WELCOME10',
        deliveryCharges: 0,
        grandTotal: 2214,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'Pending',
        status: 'New',
        statusHistory: [
          {
            status: 'New',
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            note: 'Order placed by customer Dr. Shahzad Rafiq via storefront',
            updatedBy: 'Customer'
          }
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
      },
      {
        id: 'ord-1002',
        orderNumber: 'ORD-2026-1002',
        orderDate: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        customer: {
          name: 'Ayesha Siddiqui',
          phone: '0321-9876543',
          email: 'ayesha.s@outlook.com',
          address: 'Flat 402, Al-Rehman Heights, Gulberg III',
          city: 'Lahore',
          areaOrLandmark: 'Behind Main Boulevard',
          notes: 'Deliver after 4 PM.'
        },
        items: [
          {
            medicineId: 'med-02',
            name: 'Augmentin 625mg Tablets',
            category: 'General Medicines',
            unit: 'PACK',
            quantity: 2,
            price: 590,
            compareAtPrice: 650,
            total: 1180
          },
          {
            medicineId: 'med-blue-tex',
            name: 'BLUE TEX PAD',
            category: 'Surgical Items',
            unit: 'PCS',
            quantity: 10,
            price: 85,
            compareAtPrice: 100,
            total: 850
          }
        ],
        subTotal: 2030,
        discountAmount: 0,
        deliveryCharges: 199,
        grandTotal: 2229,
        paymentMethod: 'Card / Raast',
        paymentStatus: 'Paid',
        status: 'Confirmed',
        statusHistory: [
          {
            status: 'New',
            timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
            note: 'Order placed online',
            updatedBy: 'Customer'
          },
          {
            status: 'Confirmed',
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            note: 'Payment verified via Raast Bank Transfer',
            updatedBy: 'Admin'
          }
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
      },
      {
        id: 'ord-1003',
        orderNumber: 'ORD-2026-1003',
        orderDate: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        customer: {
          name: 'Bilal Hospital Nursing Dept',
          phone: '0333-5128900',
          email: 'purchase@bilalhospital.org',
          address: 'Main Murree Road, Saddar',
          city: 'Rawalpindi',
          areaOrLandmark: 'Opposite Shell Station',
          notes: 'Urgent ward supply order.'
        },
        items: [
          {
            medicineId: 'med-10cc-bio',
            name: '10CC BIO Syringes (Pack of 50)',
            category: 'Syringes',
            unit: 'BOX',
            quantity: 5,
            price: 750,
            compareAtPrice: 900,
            total: 3750
          },
          {
            medicineId: 'med-5-1000-uni',
            name: '5% 1000ML Infusion Bottles',
            category: 'IV Infusions',
            unit: 'BOX',
            quantity: 4,
            price: 1350,
            compareAtPrice: 1600,
            total: 5400
          }
        ],
        subTotal: 9150,
        discountAmount: 500,
        couponCode: 'WELCOME10',
        deliveryCharges: 0,
        grandTotal: 8650,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'Paid',
        status: 'Delivered',
        trackingNumber: 'TCS-901842718',
        riderName: 'Imtiaz Ahmed (0301-4449900)',
        statusHistory: [
          {
            status: 'New',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
            note: 'Order created',
            updatedBy: 'Customer'
          },
          {
            status: 'Dispatched',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
            note: 'Dispatched with TCS Courier tracking TCS-901842718',
            updatedBy: 'Admin'
          },
          {
            status: 'Delivered',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
            note: 'Delivered and cash collected PKR 8,650',
            updatedBy: 'Rider'
          }
        ],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
      }
    ];

    for (const order of sampleOnlineOrders) {
      await dbOnlineOrders.save(order);
    }
  }

  console.log('Seed completed successfully with 30 items, online store products, orders, settings, bank accounts, and team users.');
};


