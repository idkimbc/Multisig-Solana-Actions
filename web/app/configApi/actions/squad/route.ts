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
  if (requestUrl.searchParams.get('address')) {
    multisigAddress = requestUrl.searchParams.get('address')!;
  }
  return { multisigAddress };
}

export const GET = async (req: Request) => {
  const requestUrl = new URL(req.url);
  const payload: ActionGetResponse = {
    title: 'SQUINT',
    icon: 'https://ucarecdn.com/cb547ecb-e122-4236-ab14-a3b44a42142f/-/preview/1030x1030/',
    description: 'you can change your wallet configuration here',
    label: 'squads',
    links: {
      actions: [
        {
          label: 'show vault',
          href: `configApi/actions/squad?address={multisigAddress}`,
          parameters: [
            {
              name: 'multisigAddress',
              label: 'Multisig Address',
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
  const { multisigAddress } = await validatedQueryParams(requestUrl);

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
    `/configApi/actions/squad/${multisigAddress}`,
    requestUrl.origin
  ).toString();

  const payload: ActionPostResponse = await createPostResponse({
    fields: {
      transaction,
      message: '',
      links: {
        next: {
          type: 'inline',
          action: {
            title: `${metadata.name}`,
            description: 'yay your vault',
            icon: `https://ucarecdn.com/0ed3740a-446f-4399-9493-1d8e9b966cf1/-/preview/1030x1021/`,
            label: 'squads',
            type: 'action',
            links: {
              actions: [
                {
                  label: 'Add member',
                  href: `/configApi/actions/squad/addMember?multisigPda=${multisigPda.toString()}`,
                },
                {
                  label: 'Remove member',
                  href: `/configApi/actions/squad/removeMember?multisigPda=${multisigPda}`,
                },
                {
                  label: 'Change threshold',
                  href: `/configApi/actions/squad/changeThreshold?multisigPda=${multisigPda}`,
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

export const OPTION = async (req: Request) => {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
};
