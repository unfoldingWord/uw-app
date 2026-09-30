import type {
  IncomingView,
  OfferView,
  PeerView,
  ReceiveResult,
  Selection,
  SendPlan,
  SendResult,
} from '@features/transfer/service';
import { fromPeer } from '@lib/packs/source';
import type { InstallOutcome } from '@lib/packs/types';
import type {
  AcceptOutcome,
  IncomingOutcome,
  OfferOutcome,
  TransferOutcome,
  TransferPlan,
  TransferSelection,
} from '@lib/transfer/types';
import type { SimDevice } from './device';
import { servicesOf } from './services';

export type TransferRun = {
  offered: Extract<OfferOutcome, { ok: true }>;
  incoming: IncomingOutcome;
  accepted: AcceptOutcome;
  sent: TransferOutcome;
  installed: InstallOutcome | undefined;
};

export async function startOffer(
  sender: SimDevice,
  plan: TransferPlan,
): Promise<Extract<OfferOutcome, { ok: true }>> {
  const offered = await sender.kernel.transfer.offer(plan);
  if (!offered.ok) {
    throw new Error(`${sender.name} could not offer: ${offered.code}`);
  }
  return offered;
}

export async function transferBetween(
  sender: SimDevice,
  receiver: SimDevice,
  plan: TransferPlan,
  selection: TransferSelection = {},
): Promise<TransferRun> {
  const offered = await startOffer(sender, plan);
  const sending = sender.kernel.transfer.run(offered.transfer);
  const peer = (await receiver.kernel.transfer.discover()).find((item) => item.code === offered.code);
  if (peer === undefined) {
    throw new Error(`${receiver.name} found no peer advertising ${offered.code}`);
  }
  const incoming = await receiver.kernel.transfer.connect(peer);
  if (!incoming.ok) {
    await sender.kernel.transfer.cancel();
    return {
      offered,
      incoming,
      accepted: { ok: false, transfer: undefined, code: incoming.code },
      sent: await sending,
      installed: undefined,
    };
  }
  const accepted = await receiver.kernel.transfer.accept(selection);
  const sent = await sending;
  const session = accepted.ok ? accepted.session : undefined;
  const installed =
    session === undefined ? undefined : await receiver.kernel.packs.install(fromPeer(session));
  return { offered, incoming, accepted, sent, installed };
}

export type ServiceTransferRun = {
  offered: Extract<OfferView, { ok: true }>;
  peers: readonly PeerView[];
  incoming: IncomingView;
  received: ReceiveResult;
  sent: SendResult;
};

export async function transferThroughServices(
  sender: SimDevice,
  receiver: SimDevice,
  plan: SendPlan,
  selection: Selection = {},
): Promise<ServiceTransferRun> {
  const from = servicesOf(sender).transfer;
  const to = servicesOf(receiver).transfer;
  const offered = await from.offer(plan);
  if (!offered.ok) {
    throw new Error(`${sender.name} could not offer: ${offered.code}`);
  }
  const sending = from.send(offered);
  const peers = await to.discover();
  const peer = peers.find((item) => item.peer.code === offered.code);
  if (peer === undefined) {
    throw new Error(`${receiver.name} found no peer advertising ${offered.code}`);
  }
  const incoming = await to.connect(peer.peer);
  if (!incoming.ok) {
    await from.cancel();
    return { offered, peers, incoming, received: incoming, sent: await sending };
  }
  const received = await to.accept(selection);
  return { offered, peers, incoming, received, sent: await sending };
}
