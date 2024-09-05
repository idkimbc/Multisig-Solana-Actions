import {
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

async function validateQueryParams(requestUrl: URL) {
  let multisigAddress = '';
  if (requestUrl.searchParams.get('address')) {
    multisigAddress = requestUrl.searchParams.get('address')!;
  }
  return { multisigAddress };
}

export const GET = async (req: Request) => {
  const requestUrl = new URL(req.url);
  const payload: ActionGetResponse = {
    title: `squint`,
    icon: 'https://ucarecdn.com/f0b82766-5c1d-4fdc-a20e-f980abed0431/-/preview/1030x1021/',
    description: `just view your vault for now`,
    label: 'Squads',
    links: {
      actions: [
        {
          label: 'show vault',
          href: `/api/actions/squad?address={multisigAddress}`,
          parameters: [
            {
              name: 'multisigAddress',
              label: 'multisig address',
              required: true,
            },
          ],
        },
      ],
    },
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

export const POST = async (req: Request) => {
  const body: ActionPostRequest = await req.json();
  const requestUrl = new URL(req.url);
  const { multisigAddress } = await validateQueryParams(requestUrl);

  let account: PublicKey = new PublicKey(body.account);
  const connection = new Connection(clusterApiUrl('mainnet-beta'));
  const transaction = new Transaction();
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: account,
      toPubkey: account,
      lamports: 0,
    })
  );
  transaction.feePayer = account;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  // multisig address is the "private key" of the vault
  let multisigPda = new PublicKey(multisigAddress);
  const { Multisig } = multisig.accounts;
  const multisigAccount = await Multisig.fromAccountAddress(
    connection,
    multisigPda
  );
  let [vault_account] = multisig.getVaultPda({
    multisigPda,
    index: 0,
  });
  const multisigInfo = await fetch(
    `https://v4-api.squads.so/multisig/${vault_account.toString()}`
  ).then((res) => res.json());
  const metadata = multisigInfo.metadata;

  const transactionIndex = multisigAccount.transactionIndex;

  const baseHref = new URL(
    `/api/actions/squad/${multisigAddress}`,
    requestUrl.origin
  ).toString();

  let members = [];
  members = multisigAccount.members.map((member) => {
    return member.key.toString();
  });
  // appending to the description (ignore)
  let description = '';
  for (let i = 0; i < members.length; i++) {
    description += `${members[i]}\n`;
  }

  const payload: ActionPostResponse = await createPostResponse({
    fields: {
      transaction,
      message: 'displaying vault',
      links: {
        next: {
          type: 'inline',
          action: {
            title: `${metadata.name}`,
            icon: 'https://ucarecdn.com/f0b82766-5c1d-4fdc-a20e-f980abed0431/-/preview/1030x1021/',
            description: description,
            label: 'Squads',
            type: 'action',
            links: {
              actions: [
                {
                  label: 'send',
                  href: `/api/actions/squad/send?multisigPda=${multisigPda.toString()}`,
                },
                {
                  label: 'deposit',
                  href: `/api/actions/squad/deposit?multisigPda=${multisigPda.toString()}`,
                },
                {
                  label: 'vote',
                  href: `${baseHref}?action=goToTxnIndex&amount=0&txnIndex={txnIndex}`,
                  parameters: [
                    {
                      name: 'txnIndex',
                      label: `vote for transaction ${transactionIndex}`,
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
