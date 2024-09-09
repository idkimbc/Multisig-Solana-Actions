import {
  ActionError,
  ActionGetRequest,
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
  let multisigAddress = "";

  if (requestUrl.searchParams.get("address")) {
    multisigAddress = requestUrl.searchParams.get("address")!;
  }

  return {multisigAddress};
}

export const GET = async (req: Request) => {
  const requestUrl = new URL(req.url);
  const {multisigAddress} = await validatedQueryParams(requestUrl);
  const connection = new Connection(clusterApiUrl("mainnet-beta"));

  let multisigPda = new PublicKey(multisigAddress);
  let [vault_account] = multisig.getVaultPda({
    multisigPda,
    index: 0
  });
  const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda
  )
  const multisigInfo = await fetch(
    `https://v4-api.squads.so/multisig/${vault_account.toString()}`
  ).then((res) => res.json());
  const metadata = multisigInfo.metadata;

  const payload: ActionGetResponse = {
    title: `${metadata.name}`,
    icon: `https://ucarecdn.com/7ae08282-2d17-4025-8206-8991c0a5865d/-/preview/1030x1030/`,
    description: `make a deposit to your vault (because you're broke)`,
    label: 'squads',
    links: {
      actions: [
        {
          label: 'Make a deposit',
          href: `/api/actions/squad/deposit?address=${multisigAddress}`,
        },
      ],
    },
  };

  return  Response.json(payload, {headers: ACTIONS_CORS_HEADERS});
}

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  const requestUrl = new URL (req.url);
  const body: ActionPostRequest = await req.json();
  let account : PublicKey = new PublicKey(body.account);
  const {multisigAddress} = await validatedQueryParams(requestUrl);
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

  const baseHref = new URL(
    `/api/actions/squad/${multisigAddress}`,
    requestUrl.origin
  ).toString();

  const transaction = new Transaction();
  transaction.add(SystemProgram.transfer({
    fromPubkey: account,
    toPubkey: account,
    lamports: 0
  }));

  transaction.feePayer = account;
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
            icon: `https://ucarecdn.com/12fbf142-a71e-450c-9720-43f30ab132c6/-/preview/1030x1030/`,
            description: 'this is your way to deposit funds to this vault',
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

  return Response.json(payload, {headers: ACTIONS_CORS_HEADERS});
}