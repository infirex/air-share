import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export enum TransferStatus {
  PENDING,
  ACCEPTED,
  REJECTED
}

interface ITransfer {
  id: string
  senderID: string
  files: { name: string; size: number }[]
  date: string
  status?: TransferStatus
}

type State = {
  transfers?: ITransfer[]
}

type Action = {
  addNewTransfer: (transfer: ITransfer) => void
  removeTransfer: (transferID: string) => void
}

export const useTransferStore = create<State & Action>()(
  persist(
    (set, get) => ({
      transfers: [],
      addNewTransfer: (transfer: ITransfer) =>
        set((state) => ({ transfers: [...(state.transfers ?? []), transfer] })),
      removeTransfer: (transferID: string) =>
        set((state) => ({
          transfers: state.transfers?.filter((transfer) => transfer.id !== transferID)
        }))
    }),
    {
      name: 'transferStore',
      partialize: (state) => ({
        transfers: state.transfers
      })
    }
  )
)
