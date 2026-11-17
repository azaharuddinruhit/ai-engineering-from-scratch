/** Shared sample data for the Module 2 labs. */

/** A small product handbook: the knowledge base the RAG labs chunk, index and ground answers in. */
export const HANDBOOK = `# Acme Cloud Customer Handbook

## Billing and refunds

Acme Cloud is billed monthly or annually. Annual plans are charged up front and include a 15% discount compared with monthly billing.

You can cancel a monthly plan at any time; the cancellation takes effect at the end of the current billing period and no partial refunds are issued.

Annual plans can be refunded within 14 days of purchase. After 14 days, annual subscriptions are not refundable, but you can downgrade at renewal. Refunds are returned to the original payment method within 5 to 10 business days.

## Rate limits

Every API key is limited to 600 requests per minute, with short bursts of up to 100 requests per second. Enterprise plans can request a higher quota.

When you exceed the limit, the API responds with HTTP 429 and a Retry-After header. Clients should back off and retry with exponential delay instead of retrying immediately.

## Data retention

Request logs are kept for 30 days on the Free and Pro plans and for 90 days on Enterprise. After the retention period, logs are permanently deleted and cannot be restored.

Customer data is stored in the region you choose at sign-up. You can export all records as JSON at any time from the dashboard.

## Single sign-on

Enterprise workspaces support single sign-on through SAML 2.0 with providers such as Okta and Azure AD. Admins can enforce SSO for all members and require MFA for password logins.

## Error reference

ERR-4012 means the webhook signature could not be verified. Check that you are using the current signing secret and that the request body was not modified by a proxy.

ERR-5003 indicates a temporary outage in the processing pipeline. These requests are safe to retry; check the status page for active incidents.`;

/** Retrieved sources for the grounding lab: three billing passages from the handbook. */
export const GROUNDING_QUESTION = 'Can I get a refund on an annual plan?';

export const GROUNDING_SOURCES = [
  {
    id: 1,
    text:
      'Annual plans can be refunded within 14 days of purchase. After 14 days, annual subscriptions are not ' +
      'refundable, but you can downgrade at renewal. Refunds are returned to the original payment method within ' +
      '5 to 10 business days.',
  },
  {
    id: 2,
    text:
      'Acme Cloud is billed monthly or annually. Annual plans are charged up front and include a 15% discount ' +
      'compared with monthly billing.',
  },
  {
    id: 3,
    text:
      'You can cancel a monthly plan at any time; the cancellation takes effect at the end of the current billing ' +
      'period and no partial refunds are issued.',
  },
] as const;

const FAITHFUL_OPENING = 'Yes, annual plans can be refunded within 14 days of purchase [1].';

export const GROUNDING_ANSWERS = [
  {
    id: 'faithful',
    label: 'Faithful',
    text:
      `${FAITHFUL_OPENING} After that, annual subscriptions are not refundable, but you can downgrade at renewal [1]. ` +
      'Refunds go back to the original payment method within 5 to 10 business days [1].',
  },
  {
    id: 'number',
    label: 'Wrong figure',
    text: `${FAITHFUL_OPENING} Refunds go back to the original payment method within 3 business days [1].`,
  },
  {
    id: 'citation',
    label: 'Wrong citation',
    text: `${FAITHFUL_OPENING} You can cancel a monthly plan at any time, and no partial refunds are issued [2].`,
  },
  {
    id: 'uncited',
    label: 'Uncited claim',
    text: `${FAITHFUL_OPENING} Enterprise customers also get a dedicated account manager.`,
  },
  {
    id: 'unsupported',
    label: 'Unsupported claim',
    text: `${FAITHFUL_OPENING} Refunds are processed instantly by bank transfer [1].`,
  },
] as const;

export interface CorpusSentence {
  id: string;
  text: string;
  topic: 'pets' | 'food' | 'money' | 'code' | 'travel' | 'ambiguous';
}

/** Short texts for exploring embedding geometry, including deliberately ambiguous ones. */
export const EMBEDDING_CORPUS: readonly CorpusSentence[] = [
  { id: 'p1', topic: 'pets', text: 'My cat sleeps next to the dog all afternoon.' },
  { id: 'p2', topic: 'pets', text: 'The vet said our puppy is a happy, healthy pet.' },
  { id: 'f1', topic: 'food', text: 'Bake the bread, then add tomato and cheese for pizza.' },
  { id: 'f2', topic: 'food', text: 'A great pasta recipe for a quick dinner.' },
  { id: 'm1', topic: 'money', text: 'The bank refunded the duplicate charge on my credit card.' },
  { id: 'm2', topic: 'money', text: 'Our annual subscription price includes a discount.' },
  { id: 'c1', topic: 'code', text: 'Deploy the API endpoint and call it from the Python SDK.' },
  { id: 'c2', topic: 'code', text: 'The JavaScript function failed with a timeout error.' },
  { id: 't1', topic: 'travel', text: 'We booked a flight and a hotel near the beach.' },
  { id: 't2', topic: 'travel', text: 'Hiking along the river into the mountains.' },
  { id: 'a1', topic: 'ambiguous', text: 'I saw a python near the river bank.' },
  {
    id: 'a2',
    topic: 'ambiguous',
    text:
      'Long product review: the subscription price is great, the refund was easy, the credit was applied, ' +
      'the invoice was clear and the payment plan saved money.',
  },
];
