export interface ParsedSmsTransaction {
  rawText: string;
  amount: number | null;
  currency: string;
  merchant: string | null;
  date: Date;
  paymentRef?: string;
  paymentMode: string;
  direction: 'debit' | 'credit';
  suggestedCategory: string;
  confidence: number;
}

export class SmsParserService {
  /**
   * Guess category based on merchant name keywords
   */
  public static guessCategory(merchant: string): string {
    const m = merchant.toLowerCase();
    if (m.includes('swiggy') || m.includes('zomato') || m.includes('starbucks') || m.includes('mcdonald') || m.includes('diner') || m.includes('restaurant') || m.includes('cafe') || m.includes('food') || m.includes('burger') || m.includes('pizza')) {
      return 'Food and dining';
    }
    if (m.includes('blinkit') || m.includes('zepto') || m.includes('instamart') || m.includes('bigbasket') || m.includes('grocer') || m.includes('mart') || m.includes('supermarket')) {
      return 'Groceries';
    }
    if (m.includes('uber') || m.includes('ola') || m.includes('rapido') || m.includes('metro') || m.includes('fuel') || m.includes('petrol') || m.includes('hpcl') || m.includes('bpcl') || m.includes('rail') || m.includes('irctc')) {
      return 'Transport and fuel';
    }
    if (m.includes('amazon') || m.includes('flipkart') || m.includes('myntra') || m.includes('ajio') || m.includes('zara') || m.includes('retail') || m.includes('mall') || m.includes('store')) {
      return 'Shopping';
    }
    if (m.includes('bescom') || m.includes('electricity') || m.includes('water') || m.includes('gas') || m.includes('broadband') || m.includes('airtel') || m.includes('jio') || m.includes('bill')) {
      return 'Bills and utilities';
    }
    if (m.includes('netflix') || m.includes('spotify') || m.includes('prime') || m.includes('hotstar') || m.includes('youtube') || m.includes('apple') || m.includes('google play') || m.includes('subscription')) {
      return 'Subscriptions';
    }
    if (m.includes('pharmacy') || m.includes('apollo') || m.includes('medplus') || m.includes('hospital') || m.includes('clinic') || m.includes('health') || m.includes('1mg')) {
      return 'Healthcare';
    }
    if (m.includes('book') || m.includes('college') || m.includes('school') || m.includes('university') || m.includes('udemy') || m.includes('coursera') || m.includes('tuition')) {
      return 'Education';
    }
    if (m.includes('pvr') || m.includes('inox') || m.includes('cinema') || m.includes('movie') || m.includes('theatre') || m.includes('game')) {
      return 'Entertainment';
    }
    if (m.includes('rent') || m.includes('pg') || m.includes('housing') || m.includes('maintenance')) {
      return 'Housing and rent';
    }
    return 'Other';
  }

  /**
   * Parse a single SMS message string
   */
  public static parseMessage(sms: string): ParsedSmsTransaction | null {
    if (!sms || !sms.trim()) return null;
    const text = sms.trim();

    // Determine direction
    const isCredit = /(credited|deposited|received|refund)/i.test(text);
    const isDebit = /(debited|paid|spent|sent|charged|withdrawn|purchase)/i.test(text);

    if (!isCredit && !isDebit) {
      // Not a transaction message (could be OTP or promo)
      return null;
    }

    const direction: 'debit' | 'credit' = isCredit ? 'credit' : 'debit';

    // Amount regex: handles Rs., Rs, INR, $, EUR, £ followed by number with optional commas
    // e.g. Rs. 450, Rs 1,200.50, INR 350.00, $42.50
    let amount: number | null = null;
    let currency = 'INR';

    const inrMatch = text.match(/(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const usdMatch = text.match(/\$\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
    const eurMatch = text.match(/€\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
    const gbpMatch = text.match(/£\s*([0-9,]+(?:\.[0-9]{1,2})?)/);

    if (inrMatch) {
      amount = parseFloat(inrMatch[1].replace(/,/g, ''));
      currency = 'INR';
    } else if (usdMatch) {
      amount = parseFloat(usdMatch[1].replace(/,/g, ''));
      currency = 'USD';
    } else if (eurMatch) {
      amount = parseFloat(eurMatch[1].replace(/,/g, ''));
      currency = 'EUR';
    } else if (gbpMatch) {
      amount = parseFloat(gbpMatch[1].replace(/,/g, ''));
      currency = 'GBP';
    } else {
      // General match
      const generalMatch = text.match(/(?:amount|amt|of)\s*(?:of)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
      if (generalMatch) {
        amount = parseFloat(generalMatch[1].replace(/,/g, ''));
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return null;
    }

    // Reference number (UPI Ref, Ref no, Txn ID)
    let paymentRef = '';
    const refMatch = text.match(/(?:UPI\s*Ref(?:\s*no\.?)?|Ref(?:\s*no\.?)?|Txn\s*ID|UTR|Ref\s*#)[:\s]*([0-9a-zA-Z]+)/i);
    if (refMatch) {
      paymentRef = refMatch[1];
    }

    // Payment Mode
    let paymentMode = 'upi';
    if (/google\s*pay|gpay/i.test(text)) {
      paymentMode = 'gpay';
    } else if (/upi/i.test(text)) {
      paymentMode = 'upi';
    } else if (/card|ending|pos/i.test(text)) {
      paymentMode = 'card';
    } else if (/net\s*banking|neft|rtgs|imps/i.test(text)) {
      paymentMode = 'bank_transfer';
    }

    // Merchant or recipient identification
    let merchant: string | null = null;
    // Patterns: "to <MERCHANT>", "at <MERCHANT>", "for <MERCHANT>", "transfer to <MERCHANT>", "vpa <MERCHANT>"
    const merchantPatterns = [
      /(?:paid\s+to|sent\s+to|transfer\s+to|to)\s+([A-Za-z0-9\s&.'_-]{2,30}?)(?=\s+(?:via|on|ref|using|avl|bal|\.|UPI))/i,
      /(?:at|towards)\s+([A-Za-z0-9\s&.'_-]{2,30}?)(?=\s+(?:on|via|ref|using|avl|bal|\.|using))/i,
      /Info:\s*([A-Za-z0-9*_-]{2,30})/i,
      /(?:VPA|UPI ID:?)\s*([A-Za-z0-9@._-]{3,35})/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        // Skip common words
        if (!['your', 'my', 'account', 'bank', 'the', 'card'].includes(candidate.toLowerCase())) {
          merchant = candidate;
          break;
        }
      }
    }

    if (!merchant) {
      merchant = paymentMode === 'gpay' ? 'Google Pay Merchant' : 'Card / Bank Merchant';
    }

    // Date parsing
    let parsedDate = new Date();
    // Patterns like "on 09-10-2026", "on 12-Oct-26", "on 08Oct26"
    const dateMatch = text.match(/(?:on\s+)?([0-9]{1,2}[-/\s][A-Za-z0-9]{2,4}[-/\s][0-9]{2,4})/i);
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    const suggestedCategory = this.guessCategory(merchant);
    const confidence = paymentRef ? 95 : merchant !== 'Google Pay Merchant' ? 80 : 65;

    return {
      rawText: text,
      amount,
      currency,
      merchant,
      date: parsedDate,
      paymentRef,
      paymentMode,
      direction,
      suggestedCategory,
      confidence,
    };
  }

  /**
   * Parse multiple SMS messages separated by newlines or delimiters
   */
  public static parseBatch(rawBatchText: string): ParsedSmsTransaction[] {
    const lines = rawBatchText.split(/\n{2,}|\r\n{2,}/).map((l) => l.trim()).filter(Boolean);
    const results: ParsedSmsTransaction[] = [];

    for (const chunk of lines) {
      const parsed = this.parseMessage(chunk);
      if (parsed) {
        results.push(parsed);
      }
    }

    // If single line or split failed, try individual line parsing
    if (results.length === 0) {
      const singleLines = rawBatchText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
      for (const line of singleLines) {
        const parsed = this.parseMessage(line);
        if (parsed) {
          results.push(parsed);
        }
      }
    }

    return results;
  }
}
