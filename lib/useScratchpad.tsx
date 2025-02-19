import { useCallback, useEffect, useRef, useState } from "react";
import { useSMARTWebMessagingContext } from "./SMARTWebMessagingContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { OperationOutcome } from "./outcome";
import { Status } from "./SMARTWebMessagingConnector";
export type Resource = Record<string, unknown> & { resourceType: string };
export type WithId<TResource> = TResource & { id: string };

export type ScratchpadCreate = {
  Request: {
    messageType: "scratchpad.create";
    payload: {
      resource: Resource;
    };
  };
  Response: {
    payload:
      | {
          location: string;
          status: string;
        }
      | {
          outcome: string;
          status: string;
        };
  };
};

export type ScratchpadRead = {
  Request: {
    messageType: "scratchpad.read";
    payload: {
      location: string;
    };
  };
  Response: {
    payload:
      | {
          resource: WithId<Resource>;
        }
      | { outcome: OperationOutcome };
  };
};

export type ScratchpadUpdate = {
  Request: {
    messageType: "scratchpad.update";
    payload: {
      resource: WithId<Resource>;
    };
  };
  Response: {
    payload: { status: string; outcome?: OperationOutcome };
  };
};

type UseScratchpadResourceOptions = {
  writeOnly?: boolean;
};

export default function useScratchpadResource<
  TInitialResource extends Record<string, unknown> & { resourceType: string },
>(
  initialResource: TInitialResource | (() => TInitialResource) | null = null,
  options: UseScratchpadResourceOptions = {},
) {
  const connector = useSMARTWebMessagingContext();
  const [resourceType, setResourceType] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(connector.status);
  const location =
    resourceType && resourceId ? `${resourceType}/${resourceId}` : null;

  const { mutate: create, mutateAsync: createAsync } = useMutation({
    mutationFn: (resource: Resource) =>
      connector
        .sendMessage<
          ScratchpadCreate["Request"],
          ScratchpadCreate["Response"]
        >("scratchpad.create", { resource })
        .then(({ payload }) => {
          if (!payload.status.startsWith("2")) {
            throw payload.outcome;
          } else {
            return payload.location as string;
          }
        }),
    onSuccess(location) {
      const [resourceType, resourceId] = location.split("/");
      setResourceType(resourceType);
      setResourceId(resourceId);
    },
  });

  const { mutate: update } = useMutation({
    mutationFn: (resource: Record<string, unknown>) =>
      connector
        .sendMessage<
          ScratchpadUpdate["Request"],
          ScratchpadUpdate["Response"]
        >("scratchpad.update", { resource: { ...resource, id: resourceId!, resourceType: resourceType! } })
        .then(({ payload }) => {
          if (!payload.status.startsWith("2")) throw payload.outcome;
        }),
  });

  const retriever = useQuery({
    initialData:
      typeof initialResource == "function"
        ? initialResource()
        : initialResource,
    queryKey: ["scratchpad.read", location],
    queryFn: () =>
      connector
        .sendMessage<ScratchpadRead["Request"], ScratchpadRead["Response"]>(
          "scratchpad.read",
          {
            location: location!,
          },
        )
        .then(({ payload }) => {
          if (payload.outcome) {
            throw payload.outcome;
          } else {
            return payload.resource;
          }
        }),
    enabled: !options.writeOnly && !!location,
  });
  const initialResourceRef = useRef(initialResource);

  useEffect(() => {
    console.debug("Mounting Scratchpad.");
    if (!connector)
      throw new Error(
        "Cannot initialize Scratchpad. No SMARTWebMessagingConnector found",
      );
    connector.ensureInitialized(setStatus).then(async () => {
      const initialResource =
        typeof initialResourceRef.current === "function"
          ? initialResourceRef.current()
          : initialResourceRef.current;
      if (initialResource !== null) {
        // Create a new resource in scratchpad
        await createAsync(initialResource);
      }
    });
  }, [createAsync, connector]);

  const setResource = useCallback(
    (resource: TInitialResource) => {
      if (!resourceId) {
        create(resource);
        return;
      }
      update(resource);
      return;
    },
    [create, update, resourceId],
  );
  return {
    resource: retriever.data,
    setResource,
    status,
  } as const;
}
