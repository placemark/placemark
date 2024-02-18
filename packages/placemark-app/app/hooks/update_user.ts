import { useMutation, useQuery } from "@blitzjs/rpc";
import { User } from "@prisma/client";
import updateUserOptions from "app/auth/mutations/updateUserOptions";
import getCurrentUser from "app/users/queries/getCurrentUser";
import getMaybeCurrentUser from "app/users/queries/getMaybeCurrentUser";
import { atom, useAtom } from "jotai";

const AVOID_REFETCH = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

/**
 * Use and modify a user setting without
 * triggering a refetch.
 */
export function useUpdateUser() {
  const [updateUserOptionsMutation] = useMutation(updateUserOptions);
  const [user, { setQueryData }] = useQuery(
    getCurrentUser,
    null,
    AVOID_REFETCH
  );

  return {
    user,
    setUser: async (param: Parameters<typeof updateUserOptionsMutation>[0]) => {
      const user = await updateUserOptionsMutation(param);
      void setQueryData(user, { refetch: false });
    },
  };
}

type MinimalUser = Pick<User, "areaUnits" | "lengthUnits">;
const userLikeAtom = atom<MinimalUser>({
  areaUnits: "meters",
  lengthUnits: "meters",
});

/**
 * Use and modify a user setting without
 * triggering a refetch.
 */
export function useUpdateMaybeUser() {
  const [userLike, setUserLike] = useAtom(userLikeAtom);
  const [updateUserOptionsMutation] = useMutation(updateUserOptions);
  const [user, { setQueryData }] = useQuery(
    getMaybeCurrentUser,
    null,
    AVOID_REFETCH
  );

  return {
    user: user || userLike,
    setUser: async (param: Partial<MinimalUser>) => {
      if (user) {
        const updatedUser = await updateUserOptionsMutation(param);
        void setQueryData(updatedUser, { refetch: false });
      } else {
        setUserLike((userLike) => {
          return {
            ...userLike,
            ...param,
          };
        });
      }
    },
  };
}
