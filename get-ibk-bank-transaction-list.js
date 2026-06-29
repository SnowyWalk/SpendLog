require('dotenv').config({ quiet: true });

const {
    EasyCodef,
    EasyCodefConstant,
} = require('easycodef-node');

const TARGET_YEAR = 2026;
const TARGET_MONTH = 6;

const ORDER_BY = process.env.ORDER_BY || '0';
const INQUIRY_TYPE = process.env.IBK_INQUIRY_TYPE || '1';

function pad2(value) {
    return String(value).padStart(2, '0');
}

function getMonthDateRange(year, month) {
    if (!Number.isInteger(year) || year < 1900) {
        throw new Error('TARGET_YEAR 값이 올바르지 않습니다');
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('TARGET_MONTH 값은 1~12 사이여야 합니다');
    }

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;

    if (
        year > todayYear ||
        (year === todayYear && month > todayMonth)
    ) {
        throw new Error('미래 월은 조회할 수 없습니다');
    }

    const lastDay = new Date(year, month, 0).getDate();
    const endDay =
        year === todayYear && month === todayMonth
            ? Math.min(lastDay, today.getDate())
            : lastDay;
    const yearMonth = `${year}${pad2(month)}`;

    return {
        startDate: `${yearMonth}01`,
        endDate: `${yearMonth}${pad2(endDay)}`,
    };
}

function parseCodefResponse(rawResponse) {
    return typeof rawResponse === 'string'
        ? JSON.parse(rawResponse)
        : rawResponse;
}

function formatUsedDateTime(date, time) {
    const normalizedDate = date && date.length === 8
        ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
        : date || '';
    const normalizedTime = time && time.length >= 4
        ? `${time.slice(0, 2)}:${time.slice(2, 4)}${time.length >= 6 ? `:${time.slice(4, 6)}` : ''}`
        : time || '';

    return `${normalizedDate} ${normalizedTime}`.trim();
}

function formatAmount(amount) {
    const numericAmount = Number(String(amount || '').replace(/,/g, ''));

    if (!Number.isFinite(numericAmount)) {
        return amount || '';
    }

    return numericAmount.toLocaleString('ko-KR');
}

function pickTransactionName(transaction) {
    return [
        transaction.resAccountDesc1,
        transaction.resAccountDesc2,
        transaction.resAccountDesc3,
        transaction.resAccountDesc4,
    ].find(Boolean) || '';
}

function pickTransactionAmount(transaction) {
    const inAmount = Number(String(transaction.resAccountIn || '').replace(/,/g, ''));
    const outAmount = Number(String(transaction.resAccountOut || '').replace(/,/g, ''));

    if (Number.isFinite(inAmount) && inAmount > 0) {
        return `+${formatAmount(transaction.resAccountIn)} KRW`;
    }

    if (Number.isFinite(outAmount) && outAmount > 0) {
        return `-${formatAmount(transaction.resAccountOut)} KRW`;
    }

    return '';
}

function redactCodefResponse(response) {
    if (!response || typeof response !== 'object') {
        return response;
    }

    const transactions = response.data?.resTrHistoryList;

    return {
        result: response.result,
        transactionCount: Array.isArray(transactions) ? transactions.length : 0,
        connectedId: response.connectedId ? '<redacted>' : response.connectedId,
    };
}

function createCodef() {
    const {
        CODEF_DEMO_CLIENT_ID,
        CODEF_DEMO_CLIENT_SECRET,
        CODEF_CLIENT_ID,
        CODEF_CLIENT_SECRET,
        CODEF_PUBLIC_KEY,
    } = process.env;

    if (!CODEF_DEMO_CLIENT_ID || !CODEF_DEMO_CLIENT_SECRET) {
        throw new Error('CODEF_DEMO_CLIENT_ID / CODEF_DEMO_CLIENT_SECRET 값이 필요함');
    }

    if (!CODEF_PUBLIC_KEY) {
        throw new Error('CODEF_PUBLIC_KEY 값이 필요함');
    }

    const codef = new EasyCodef();

    codef.setPublicKey(CODEF_PUBLIC_KEY);
    codef.setClientInfoForDemo(
        CODEF_DEMO_CLIENT_ID,
        CODEF_DEMO_CLIENT_SECRET
    );

    if (CODEF_CLIENT_ID && CODEF_CLIENT_SECRET) {
        codef.setClientInfo(CODEF_CLIENT_ID, CODEF_CLIENT_SECRET);
    }

    return codef;
}

async function main() {
    const {
        CODEF_CONNECTED_ID,
        BIRTH_DATE,
        IBK_ACCOUNT,
    } = process.env;

    if (!CODEF_CONNECTED_ID) {
        throw new Error('CODEF_CONNECTED_ID 값이 필요함');
    }

    if (!IBK_ACCOUNT) {
        throw new Error('IBK_ACCOUNT 값이 필요함. 숫자만 입력');
    }

    const codef = createCodef();
    const { startDate, endDate } = getMonthDateRange(TARGET_YEAR, TARGET_MONTH);

    const productUrl = '/v1/kr/bank/p/account/transaction-list';
    const params = {
        connectedId: CODEF_CONNECTED_ID,
        organization: '0003', // 기업은행
        account: IBK_ACCOUNT,
        startDate,
        endDate,
        orderBy: ORDER_BY,
        inquiryType: INQUIRY_TYPE,
    };

    if (BIRTH_DATE) {
        params.birthDate = BIRTH_DATE;
    }

    console.log(`기업은행 수시입출 거래내역 조회: ${startDate} ~ ${endDate}`);

    const rawResponse = await codef.requestProduct(
        productUrl,
        EasyCodefConstant.SERVICE_TYPE_DEMO,
        params
    );

    const response = parseCodefResponse(rawResponse);
    console.dir(redactCodefResponse(response), { depth: null });

    if (response?.result?.code !== 'CF-00000') {
        console.error('조회 실패');
        console.error('code:', response?.result?.code);
        console.error('message:', response?.result?.message);
        console.error('extraMessage:', response?.result?.extraMessage);
        return;
    }

    const transactions = response?.data?.resTrHistoryList ?? [];

    console.log(`\n거래내역 ${Array.isArray(transactions) ? transactions.length : 0}건`);

    if (Array.isArray(transactions)) {
        console.table(transactions.map((transaction) => ({
            일시: formatUsedDateTime(
                transaction.resAccountTrDate,
                transaction.resAccountTrTime
            ),
            이름: pickTransactionName(transaction),
            가격: pickTransactionAmount(transaction),
        })));
    }
}

main().catch((error) => {
    console.error('기업은행 수시입출 거래내역 조회 중 오류 발생');
    console.error(error);
});
