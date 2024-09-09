import {
  createActionHeaders,
  NextActionPostRequest,
  ActionError,
  CompletedAction,
  ACTIONS_CORS_HEADERS,
  ActionGetRequest,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  createPostResponse,
} from '@solana/actions';
import {
  SystemProgram,
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import * as multisig from '../../../../../node_modules/@sqds/multisig/lib/index';

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { multisigAddress } = await validatedQueryParams(requestUrl);
    const connection = new Connection(clusterApiUrl("mainnet-beta"));

    let multisigPda = new PublicKey(multisigAddress);
    let [vault_account] = multisig.getVaultPda({
      multisigPda,
      index: 0,
    });
    const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
      connection,
      multisigPda
    );
    const multisigInfo = await fetch(
      `https://v4-api.squads.so/multisig/${vault_account.toString()}`
    ).then((res) => res.json());
    const metadata = multisigInfo.metadata;

    const payload: ActionGetResponse = {
      title: `${metadata.name}`,
      icon: `https://ucarecdn.com/7ae08282-2d17-4025-8206-8991c0a5865d/-/preview/1030x1030/`,
      description: `View your vault, perform squads actions and vote on transactions!`,
      label: 'Squads',
      links: {
        actions: [
          {
            label: 'Initiate a transaction',
            href: `/api/actions/squad?address=${multisigAddress}`,
          },
        ],
      },
    };

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = 'invalid Multisig PDA';
    if (typeof err == 'string') message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

export const POST = async (req: Request) => {
  const requestUrl = new URL(req.url);
  const { multisigAddress } = await validatedQueryParams(requestUrl);
  const multisigPda = new PublicKey(multisigAddress);

  const connection = new Connection(clusterApiUrl('mainnet-beta'));
  const baseHref = new URL(
    `/api/actions/squad/${multisigAddress}`,
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
            title: 'send money ?!',
            icon: `https://ucarecdn.com/12fbf142-a71e-450c-9720-43f30ab132c6/-/preview/1030x1030/`,
            description: 'you can send money from your vault to other wallets',
            label: 'Squads',
            type: 'action',
            links: {
              actions: [
                {
                  label: 'send',
                  href: `${baseHref}?action=send&amount={sendAmount}&wallet={wallet}`,
                  parameters: [
                    {
                      name: 'sendAmount',
                      label: 'amount',
                      required: true,
                    },
                    {
                      name: 'wallet',
                      label: 'wallet address of recipient',
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

export const OPTIONS = GET;

async function validatedQueryParams(requestUrl: URL) {
  let multisigAddress = '';
  try {
    if (requestUrl.searchParams.get('address')) {
      multisigAddress = requestUrl.searchParams.get('address')!;
    }
  } catch (err) {
    throw 'Invalid input query parameter';
  }

  return { multisigAddress };
}
