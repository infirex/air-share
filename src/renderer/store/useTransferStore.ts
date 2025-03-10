import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export enum TransferStatus {
  PENDING,
  ACCEPTED,
  REJECTED,
  SUCCESSFUL,
  CANCELED
}

interface ITransfer {
  id: string
  senderID: string
  files: { name: string; size: number }[]
  date: string
  status?: TransferStatus
  targetPath: string
}

type State = {
  transfers?: ITransfer[]
}

type Action = {
  addNewTransfer: (transfer: ITransfer) => void
  removeTransfer: (transferID: string) => void
  updateTransfer: (transferID: string, prop: Partial<ITransfer>) => void
}

export const useTransferStore = create<State & Action>()(
  persist(
    (set) => ({
      transfers: [],
      addNewTransfer: (transfer: ITransfer) =>
        set((state) => ({ transfers: [transfer, ...(state.transfers ?? [])] })),
      removeTransfer: (transferID: string) =>
        set((state) => ({
          transfers: state.transfers?.filter((transfer) => transfer.id !== transferID)
        })),
      updateTransfer: (transferID: string, prop: Partial<ITransfer>) =>
        set((state) => ({
          transfers: (state.transfers ?? []).map((transfer) =>
            transfer.id === transferID ? { ...transfer, ...prop } : transfer
          )
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
