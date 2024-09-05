import {
    ActionError,
    ActionGetResponse,
    ActionPostRequest,
    ActionPostResponse,
    ACTIONS_CORS_HEADERS,
    createPostResponse,
  } from '@solana/actions';
  import {
    clusterApiUrl,
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionStatus,
  } from '@solana/web3.js';
  import * as multisig from '@sqds/multisig';
  import { transactionMessageBeet } from '@sqds/multisig/lib/types';
  
  async function validatedQueryParams(requestUrl: URL) {
    let m = '';
    if (requestUrl.searchParams.get('multisigPda')) {
      m = requestUrl.searchParams.get('multisigPda')!;
    }
    return { m };
  }
  
  export const GET = async (req: Request) => {
    return Response.json({ message: 'Method not supported' } as ActionError, {
      status: 403,
      headers: ACTIONS_CORS_HEADERS,
    });
  };
  
  export const POST = async (req: Request) => {
    const requestUrl = new URL(req.url);
    const { m } = await validatedQueryParams(requestUrl);
    const multisigPda = new PublicKey(m);
  
    const connection = new Connection(clusterApiUrl('mainnet-beta'));
    const baseHref = new URL(
      `/api/actions/squad/${m}`,
      requestUrl.origin
    ).toString();
  
    let [vault_account] = multisig.getVaultPda({
      multisigPda,
      index: 0,
    });
  
    const body: ActionPostRequest = await req.json();
    let payerAccount: PublicKey = new PublicKey(body.account);
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payerAccount,
        toPubkey: payerAccount,
        lamports: 0,
      })
    );
    transaction.feePayer = payerAccount;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
  
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction: transaction,
        message: '',
        links: {
          next: {
            type: 'inline',
            action: {
              title: 'deposit money ?!',
              icon: 'https://ucarecdn.com/f0b82766-5c1d-4fdc-a20e-f980abed0431/-/preview/1030x1021/',
              description: 'deposit money to your vault',
              label: 'Squads',
              type: 'action',
              links: {
                actions: [
                  {
                    label: 'deposit',
                    href: `${baseHref}?action=deposit&amount={sendAmount}`,
                    parameters: [
                      {
                        name: 'sendAmount',
                        label: 'amount',
                        required: true,
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    });
  
    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
  };
  
  export const OPTIONS = async (req: Request) => {
    return new Response(null, {
      status: 204,
      headers: ACTIONS_CORS_HEADERS,
    });
  };
  