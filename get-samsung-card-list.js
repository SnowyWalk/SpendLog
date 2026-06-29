require('dotenv').config({ quiet: true });

const {
    EasyCodef,
    EasyCodefConstant,
} = require('easycodef-node');

async function main() {
    const {
        CODEF_DEMO_CLIENT_ID,
        CODEF_DEMO_CLIENT_SECRET,
        CODEF_CLIENT_ID,
        CODEF_CLIENT_SECRET,
        CODEF_PUBLIC_KEY,
        CODEF_CONNECTED_ID,
        BIRTH_DATE,
    } = process.env;

    if (!CODEF_DEMO_CLIENT_ID || !CODEF_DEMO_CLIENT_SECRET) {
        throw new Error('CODEF_DEMO_CLIENT_ID / CODEF_DEMO_CLIENT_SECRET 값이 필요함');
    }

    if (!CODEF_PUBLIC_KEY) {
        throw new Error('CODEF_PUBLIC_KEY 값이 필요함');
    }

    if (!CODEF_CONNECTED_ID) {
        throw new Error('CODEF_CONNECTED_ID 값이 필요함');
    }

    if (!BIRTH_DATE) {
        throw new Error('BIRTH_DATE 값이 필요함. 예: 950307');
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

    const productUrl = '/v1/kr/card/p/account/card-list';

    const params = {
        connectedId: CODEF_CONNECTED_ID,
        organization: '0303', // 삼성카드
        birthDate: BIRTH_DATE,
        inquiryType: '0',
    };

    const rawResponse = await codef.requestProduct(
        productUrl,
        EasyCodefConstant.SERVICE_TYPE_DEMO,
        params
    );

    const response =
        typeof rawResponse === 'string'
            ? JSON.parse(rawResponse)
            : rawResponse;

    console.dir({
        result: response?.result,
        dataCount: Array.isArray(response?.data) ? response.data.length : 0,
        connectedId: response?.connectedId ? '<redacted>' : response?.connectedId,
    }, { depth: null });

    const resultCode = response?.result?.code;

    if (resultCode !== 'CF-00000') {
        console.error('조회 실패');
        console.error('code:', response?.result?.code);
        console.error('message:', response?.result?.message);
        console.error('extraMessage:', response?.result?.extraMessage);
        return;
    }

    const cards = response?.data ?? [];

    console.log('\n보유카드 목록:');

    for (const card of cards) {
        console.log({
            cardName: card.resCardName,
            cardNo: card.resCardNo,
            cardType: card.resCardType,
            issueDate: card.resIssueDate,
            sleepYN: card.resSleepYN,
        });
    }
}

main().catch((error) => {
    console.error('삼성카드 보유카드 조회 중 오류 발생');
    console.error(error);
});
