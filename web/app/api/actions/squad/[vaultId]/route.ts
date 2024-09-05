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
  Authorized,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  TransactionMessage,
  LAMPORTS_PER_SOL,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  VersionedMessage,
  VersionedTransaction,
} from '@solana/web3.js';
//@ts-ignore
import * as multisig from '../../../../../../node_modules/@sqds/multisig/lib/index';

let vault_account: PublicKey;
let multisigPda: PublicKey;

export const GET = async (req: Request) => {
  return Response.json({ message: 'Method not supported' } as ActionError, {
    status: 403,
    headers: ACTIONS_CORS_HEADERS,
  });
};

export const POST = async (
  req: Request,
  { params }: { params: { vaultId: string } }
) => {
  try {
    const requestUrl = new URL(req.url);
    const { action, amount, txnIndexForChecking, wallet } =
      validatedQueryParams(requestUrl);

    const body: ActionPostRequest = await req.json();
    let payerAccount: PublicKey;
    try {
      payerAccount = new PublicKey(body.account);
    } catch (err) {
      throw 'Invalid "account" provided';
    }

    const multisg = params.vaultId;
    multisigPda = new PublicKey(multisg);

    [vault_account] = multisig.getVaultPda({
      multisigPda,
      index: 0,
    });

    const baseHref = new URL(
      `/api/actions/squad/${multisg}`,
      requestUrl.origin
    ).toString();
    console.log('BASE HREF: ', baseHref);

    const connection = new Connection(clusterApiUrl('mainnet-beta'));

    let transaction = new Transaction();
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
      connection,
      multisigPda
    );
    const txnIndex = multisigInfo.transactionIndex;

    let finalTxnIndex;
    if (txnIndexForChecking && txnIndexForChecking != 0) {
      finalTxnIndex = txnIndexForChecking;
    } else {
      finalTxnIndex = Number(multisigInfo.transactionIndex) + 1;
    }

    if (action == 'send') {
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: vault_account,
        toPubkey: new PublicKey(wallet),
        lamports: amount * LAMPORTS_PER_SOL,
      });
      const transferMessage = new TransactionMessage({
        payerKey: vault_account,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: [transferInstruction],
      });
      const IX1 = multisig.instructions.vaultTransactionCreate({
        multisigPda,
        transactionIndex: BigInt(Number(txnIndex) + 1),
        creator: payerAccount,
        vaultIndex: 0,
        ephemeralSigners: 0,
        transactionMessage: transferMessage,
      });
      transaction.add(IX1);
    }

    if (action == 'deposit') {
      const ixn = SystemProgram.transfer({
        fromPubkey: payerAccount,
        toPubkey: vault_account,
        lamports: amount * LAMPORTS_PER_SOL,
      });
      transaction.add(ixn);
    }

    if (action == 'goToTxnIndex') {
      console.log(`GOING TO TXN INDEX #${txnIndexForChecking}`);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payerAccount,
          toPubkey: payerAccount,
          lamports: 0,
        })
      );
    }

    transaction.feePayer = payerAccount;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;


    let payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Transaction Successful`,
        links:
          action !== 'deposit'
            ? {
                next: {
                  type: 'inline',
                  action: {
                    title: `Vote on Transaction #${finalTxnIndex}`,
                    icon: 'https://ucarecdn.com/f0b82766-5c1d-4fdc-a20e-f980abed0431/-/preview/1030x1021/',
                    description: ``,
                    label: 'Squads',
                    type: 'action',
                    links: {
                      actions: [
                        {
                          label: 'Approve',
                          href: `/api/actions/squad/vote?multisigPda=${multisigPda.toString()}&txnIndex=${finalTxnIndex}&action=approve`,
                        },
                        {
                          label: 'Execute',
                          href: `/api/actions/squad/vote?multisigPda=${multisigPda.toString()}&txnIndex=${finalTxnIndex}&action=execute`,
                        },
                        {
                          label: 'Reject',
                          href: `/api/actions/squad/vote?multisigPda=${multisigPda.toString()}&txnIndex=${finalTxnIndex}&action=reject`,
                        },
                        {
                          label: 'Approve and Execute',
                          href: `/api/actions/squad/vote?multisigPda=${multisigPda.toBase58()}&txnIndex=${finalTxnIndex}&action=approveandexecute`,
                        },
                      ],
                    },
                  },
                },
              }
            : undefined,
      },
    });

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = 'An unknown error occurred';
    if (typeof err == 'string') message = err;
    return new Response(JSON.stringify(message), {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

export const OPTIONS = async (req: Request) => {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
};

function validatedQueryParams(requestUrl: URL) {
  let action;
  let amount = 0.001;
  let txnIndexForChecking = 0;
  let wallet = '';
  try {
    if (requestUrl.searchParams.get('action')) {
      action = requestUrl.searchParams.get('action')!;
    }
  } catch (err) {
    throw 'Invalid input query parameters';
  }
  try {
    if (requestUrl.searchParams.get('amount')) {
      amount = parseFloat(requestUrl.searchParams.get('amount')!);
    }
  } catch (err) {
    throw 'Invalid input query parameters';
  }
  if (requestUrl.searchParams.get('txnIndex')) {
    txnIndexForChecking = parseInt(requestUrl.searchParams.get('txnIndex')!);
  }
  if (requestUrl.searchParams.get('wallet')) {
    wallet =
      requestUrl.searchParams.get('wallet') ||
      '46Cx8SHg8jojWgG6QdytHZK8Fr2eheK6YqZDaSy49q4V';
  }
  return { action, amount, txnIndexForChecking, wallet };
}
