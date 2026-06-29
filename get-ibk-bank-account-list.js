require('dotenv').config({ quiet: true });

const {
    EasyCodef,
    EasyCodefConstant,
} = require('easycodef-node');

function parseCodefResponse(rawResponse) {
    return typeof rawResponse === 'string'
        ? JSON.parse(rawResponse)
        : rawResponse;
}

function maskAccount(account) {
    const value = String(account || '');

    if (value.length <= 4) {
        return value ? '****' : '';
    }

    return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function formatAmount(amount, currency) {
    const numericAmount = Number(String(amount || '').replace(/,/g, ''));
    const formatted = Number.isFinite(numericAmount)
        ? numericAmount.toLocaleString('ko-KR')
        : amount || '';

    return `${formatted}${currency ? ` ${currency}` : ''}`.trim();
}

function toArray(value) {
    if (!value) {
        return [];
    }

    return Array.isArray(value) ? value : [value];
}

function flattenAccounts(data) {
    return [
        ...toArray(data?.resDepositTrust).map((account) => ({
            type: '예금/신탁',
            ...account,
        })),
        ...toArray(data?.resForeignCurrency).map((account) => ({
            type: '외화',
            ...account,
        })),
        ...toArray(data?.resFund).map((account) => ({
            type: '펀드',
            ...account,
        })),
        ...toArray(data?.resLoan).map((account) => ({
            type: '대출',
            ...account,
        })),
        ...toArray(data?.resInsurance).map((account) => ({
            type: '보험',
            ...account,
        })),
    ];
}

function redactCodefResponse(response) {
    if (!response || typeof response !== 'object') {
        return response;
    }

    return {
        result: response.result,
        accountCount: flattenAccounts(response.data).length,
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
    const { CODEF_CONNECTED_ID, BIRTH_DATE } = process.env;

    if (!CODEF_CONNECTED_ID) {
        throw new Error('CODEF_CONNECTED_ID 값이 필요함');
    }

    const codef = createCodef();
    const productUrl = '/v1/kr/bank/p/account/account-list';
    const params = {
        connectedId: CODEF_CONNECTED_ID,
        organization: '0003', // 기업은행
    };

    if (BIRTH_DATE) {
        params.birthDate = BIRTH_DATE;
    }

    console.log('기업은행 보유계좌 조회');

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

    const accounts = flattenAccounts(response.data);

    console.log(`\n보유계좌 ${accounts.length}건`);
    console.table(accounts.map((account) => ({
        구분: account.type,
        계좌표시: account.resAccountDisplay || maskAccount(account.resAccount),
        계좌끝4자리: String(account.resAccount || '').slice(-4),
        계좌명: account.resAccountName,
        별칭: account.resAccountNickName,
        잔액: formatAmount(account.resAccountBalance, account.resAccountCurrency),
        신규일: account.resAccountStartDate,
        최종거래일: account.resLastTranDate,
    })));
}

main().catch((error) => {
    console.error('기업은행 보유계좌 조회 중 오류 발생');
    console.error(error);
});
