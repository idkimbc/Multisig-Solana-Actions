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

async function validatedQueryParams(requestUrl: URL) {
  let multisigAddress = '';
  let action: String | null = requestUrl.searchParams.get('action');
  if (requestUrl.searchParams.get('address')) {
    multisigAddress = requestUrl.searchParams.get('address')!;
  }
  return { multisigAddress, action };
}

export const GET = async (req: Request) => {
  const requestUrl = new URL(req.url);
  const { multisigAddress } = await validatedQueryParams(requestUrl);
  const connection = new Connection(clusterApiUrl('mainnet-beta'));

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
    description: `configure your wallet`,
    label: 'squads',
    links: {
      actions: [
        {
          label: 'Add member',
          href: `/api/actions/squad/config?address=${multisigAddress}&action=add`,
        },
        {
          label: 'Remove member',
          href: `/api/actions/squad/config?address=${multisigAddress}&action=remove`,
        },
        {
          label: 'Change threshold',
          href: `/api/actions/squad/config?address=${multisigAddress}&action=change`,
        },
      ],
    },
  };
  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  const body: ActionPostRequest = await req.json();
  let account: PublicKey = new PublicKey(body.account);
  const requestUrl = new URL(req.url);
  const { multisigAddress, action } = await validatedQueryParams(requestUrl);
  const connection = new Connection(clusterApiUrl('mainnet-beta'));

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

  const transaction = new Transaction().add(
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

  if (action == 'add') {
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: '',
        links: {
          next: {
            type: 'inline',
            action: {
              title: `${metadata.name}`,
              icon: `https://ucarecdn.com/7ae08282-2d17-4025-8206-8991c0a5865d/-/preview/1030x1030/`,
              description: 'something',
              label: 'squad',
              type: 'action',
              links: {
                actions: [
                  {
                    label: 'Add',
                    href: `${baseHref}?action=add&memberAddress={memberAddress}`,
                    parameters: [
                      {
                        name: 'memberAddress',
                        label: "Enter member's address",
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
  }

  if (action == 'change') {
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: '',
        links: {
          next: {
            type: 'inline',
            action: {
              title: `${metadata.name}`,
              icon: `https://ucarecdn.com/7ae08282-2d17-4025-8206-8991c0a5865d/-/preview/1030x1030/`,
              description: `current threshold: ${multisigAccount.threshold}`,
              label: 'squad',
              type: 'action',
              links: {
                actions: [
                  {
                    label: 'Change Threshold',
                    href: `${baseHref}?action=change&newThreshold={newThreshold}`,
                    parameters: [
                      {
                        name: 'newThreshold',
                        label: "Enter new threshold",
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
  }

  if (action == 'remove') {
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: '',
        links: {
          next: {
            type: 'inline',
            action: {
              title: `${metadata.name}`,
              icon: `https://ucarecdn.com/7ae08282-2d17-4025-8206-8991c0a5865d/-/preview/1030x1030/`,
              description: 'remove member',
              label: 'squad',
              type: 'action',
              links: {
                actions: [
                  {
                    label: 'Remove',
                    href: `${baseHref}?action=remove&memberAddress={memberAddress}`,
                    parameters: [
                      {
                        name: 'memberAddress',
                        label: "Enter member's address",
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
  }
};
