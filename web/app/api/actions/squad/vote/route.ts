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
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
//@ts-ignore
import * as multisig from '../../../../../../node_modules/@sqds/multisig/lib/index';
import { NextActionLink } from '@solana/actions-spec';

async function validatedQueryParams(requestUrl: URL) {
  let multisigAddress = '';
  let transactionNumber = 0;
  let action: String | null = requestUrl.searchParams.get('action');
  if (requestUrl.searchParams.get("address")) {
    multisigAddress = requestUrl.searchParams.get("address")!;
  }
  if (requestUrl.searchParams.get("transactionNumber")) {
    transactionNumber = parseInt(requestUrl.searchParams.get("transactionNumber")!);
  }
  return {multisigAddress, transactionNumber};
}

export const GET = async (req: Request) => {
  const requestUrl = new URL(req.url);
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

  const payload: ActionGetResponse = {
    title: `${metadata.name}`,
    icon: `https://ucarecdn.com/7ae08282-2d17-4025-8206-8991c0a5865d/-/preview/1030x1030/`,
    description: `Enter a transaction number for which you want to cast your vote
    Latest transaction: ${multisigAccount.transactionIndex}`,
    label: 'squads',
    links: {
      actions: [
        {
          label: 'Vote',
          href: `/api/actions/squad/vote?address=${multisigAddress}&transactionNumber={transactionNumber}`,
          parameters: [
            {
              label: "enter transaction number",
              name: "transactionNumber",
              required: true
            }
          ]
        }
      ],
    },
  };

  return Response.json(payload, {headers: ACTIONS_CORS_HEADERS});
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  const requestUrl = new URL(req.url);
  const {multisigAddress, transactionNumber} = await validatedQueryParams(requestUrl);
}