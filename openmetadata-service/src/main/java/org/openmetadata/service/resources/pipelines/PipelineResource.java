/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.service.resources.pipelines;

import io.swagger.annotations.Api;
import io.swagger.v3.oas.annotations.ExternalDocumentation;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import java.io.IOException;
import java.util.UUID;
import javax.json.JsonPatch;
import javax.validation.Valid;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.PATCH;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.UriInfo;
import org.openmetadata.schema.api.data.CreatePipeline;
import org.openmetadata.schema.api.data.RestoreEntity;
import org.openmetadata.schema.entity.data.Pipeline;
import org.openmetadata.schema.entity.data.PipelineStatus;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.schema.type.EntityHistory;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.MetadataOperation;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.jdbi3.PipelineRepository;
import org.openmetadata.service.resources.Collection;
import org.openmetadata.service.resources.EntityResource;
import org.openmetadata.service.resources.dqtests.TestCaseResource;
import org.openmetadata.service.security.Authorizer;
import org.openmetadata.service.security.policyevaluator.OperationContext;
import org.openmetadata.service.util.RestUtil;
import org.openmetadata.service.util.ResultList;

@Path("/v1/pipelines")
@Api(value = "Pipelines collection", tags = "Pipelines collection")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "pipelines")
public class PipelineResource extends EntityResource<Pipeline, PipelineRepository> {
  public static final String COLLECTION_PATH = "v1/pipelines/";

  @Override
  public Pipeline addHref(UriInfo uriInfo, Pipeline pipeline) {
    pipeline.setHref(RestUtil.getHref(uriInfo, COLLECTION_PATH, pipeline.getId()));
    Entity.withHref(uriInfo, pipeline.getOwner());
    Entity.withHref(uriInfo, pipeline.getService());
    Entity.withHref(uriInfo, pipeline.getFollowers());
    return pipeline;
  }

  public PipelineResource(CollectionDAO dao, Authorizer authorizer) {
    super(Pipeline.class, new PipelineRepository(dao), authorizer);
  }

  public static class PipelineList extends ResultList<Pipeline> {
    @SuppressWarnings("unused")
    PipelineList() {
      // Empty constructor needed for deserialization
    }
  }

  public static class PipelineStatusList extends ResultList<PipelineStatus> {
    @SuppressWarnings("unused")
    public PipelineStatusList() {
      /* Required for serde */
    }
  }

  static final String FIELDS = "owner,tasks,pipelineStatus,followers,tags,extension";

  @GET
  @Valid
  @Operation(
      operationId = "listPipelines",
      summary = "List Pipelines",
      tags = "pipelines",
      description =
          "Get a list of pipelines, optionally filtered by `service` it belongs to. Use `fields` "
              + "parameter to get only necessary fields. Use cursor-based pagination to limit the number "
              + "entries in the list using `limit` and `before` or `after` query params.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of pipelines",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = PipelineList.class)))
      })
  public ResultList<Pipeline> list(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(
              description = "Filter pipelines by service name",
              schema = @Schema(type = "string", example = "airflow"))
          @QueryParam("service")
          String serviceParam,
      @Parameter(description = "Limit the number pipelines returned. (1 to 1000000, " + "default = 10)")
          @DefaultValue("10")
          @Min(0)
          @Max(1000000)
          @QueryParam("limit")
          int limitParam,
      @Parameter(description = "Returns list of pipelines before this cursor", schema = @Schema(type = "string"))
          @QueryParam("before")
          String before,
      @Parameter(description = "Returns list of pipelines after this cursor", schema = @Schema(type = "string"))
          @QueryParam("after")
          String after,
      @Parameter(
              description = "Include all, deleted, or non-deleted entities.",
              schema = @Schema(implementation = Include.class))
          @QueryParam("include")
          @DefaultValue("non-deleted")
          Include include)
      throws IOException {
    ListFilter filter = new ListFilter(include).addQueryParam("service", serviceParam);
    return super.listInternal(uriInfo, securityContext, fieldsParam, filter, limitParam, before, after);
  }

  @GET
  @Path("/{id}/versions")
  @Operation(
      operationId = "listAllPipelineVersion",
      summary = "List pipeline versions",
      tags = "pipelines",
      description = "Get a list of all the versions of a pipeline identified by `id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of pipeline versions",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = EntityHistory.class)))
      })
  public EntityHistory listVersions(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "pipeline Id", schema = @Schema(type = "string")) @PathParam("id") UUID id)
      throws IOException {
    return super.listVersionsInternal(securityContext, id);
  }

  @GET
  @Path("/{id}")
  @Operation(
      operationId = "getPipelineWithID",
      summary = "Get a pipeline",
      tags = "pipelines",
      description = "Get a pipeline by `id`.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The pipeline",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Pipeline.class))),
        @ApiResponse(responseCode = "404", description = "Pipeline for instance {id} is not found")
      })
  public Pipeline get(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(
              description = "Include all, deleted, or non-deleted entities.",
              schema = @Schema(implementation = Include.class))
          @QueryParam("include")
          @DefaultValue("non-deleted")
          Include include)
      throws IOException {
    return getInternal(uriInfo, securityContext, id, fieldsParam, include);
  }

  @GET
  @Path("/name/{fqn}")
  @Operation(
      operationId = "getPipelineByFQN",
      summary = "Get a pipeline by name",
      tags = "pipelines",
      description = "Get a pipeline by fully qualified name.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The pipeline",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Pipeline.class))),
        @ApiResponse(responseCode = "404", description = "Pipeline for instance {id} is not found")
      })
  public Pipeline getByName(
      @Context UriInfo uriInfo,
      @PathParam("fqn") String fqn,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(
              description = "Include all, deleted, or non-deleted entities.",
              schema = @Schema(implementation = Include.class))
          @QueryParam("include")
          @DefaultValue("non-deleted")
          Include include)
      throws IOException {
    return getByNameInternal(uriInfo, securityContext, fqn, fieldsParam, include);
  }

  @GET
  @Path("/{id}/versions/{version}")
  @Operation(
      operationId = "getSpecificPipelineVersion",
      summary = "Get a version of the pipeline",
      tags = "pipelines",
      description = "Get a version of the pipeline by given `id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "pipeline",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Pipeline.class))),
        @ApiResponse(
            responseCode = "404",
            description = "Pipeline for instance {id} and version {version} is " + "not found")
      })
  public Pipeline getVersion(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Pipeline Id", schema = @Schema(type = "string")) @PathParam("id") UUID id,
      @Parameter(
              description = "Pipeline version number in the form `major`.`minor`",
              schema = @Schema(type = "string", example = "0.1 or 1.1"))
          @PathParam("version")
          String version)
      throws IOException {
    return super.getVersionInternal(securityContext, id, version);
  }

  @POST
  @Operation(
      operationId = "createPipeline",
      summary = "Create a pipeline",
      tags = "pipelines",
      description = "Create a new pipeline.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The pipeline",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Pipeline.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response create(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreatePipeline create)
      throws IOException {
    Pipeline pipeline = getPipeline(create, securityContext.getUserPrincipal().getName());
    return create(uriInfo, securityContext, pipeline);
  }

  @PATCH
  @Path("/{id}")
  @Operation(
      operationId = "patchPipeline",
      summary = "Update a Pipeline",
      tags = "pipelines",
      description = "Update an existing pipeline using JsonPatch.",
      externalDocs = @ExternalDocumentation(description = "JsonPatch RFC", url = "https://tools.ietf.org/html/rfc6902"))
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  public Response updateDescription(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") UUID id,
      @RequestBody(
              description = "JsonPatch with array of operations",
              content =
                  @Content(
                      mediaType = MediaType.APPLICATION_JSON_PATCH_JSON,
                      examples = {
                        @ExampleObject("[" + "{op:remove, path:/a}," + "{op:add, path: /b, value: val}" + "]")
                      }))
          JsonPatch patch)
      throws IOException {
    return patchInternal(uriInfo, securityContext, id, patch);
  }

  @PUT
  @Operation(
      operationId = "createOrUpdatePipeline",
      summary = "Create or update a pipeline",
      tags = "pipelines",
      description = "Create a new pipeline, if it does not exist or update an existing pipeline.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The pipeline",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Pipeline.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response createOrUpdate(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreatePipeline create)
      throws IOException {
    Pipeline pipeline = getPipeline(create, securityContext.getUserPrincipal().getName());
    return createOrUpdate(uriInfo, securityContext, pipeline);
  }

  @PUT
  @Path("/{fqn}/status")
  @Operation(
      operationId = "addStatusData",
      summary = "Add status data",
      tags = "pipelines",
      description = "Add status data to the pipeline.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The pipeline with a the new status",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Pipeline.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Pipeline addPipelineStatus(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the pipeline", schema = @Schema(type = "string")) @PathParam("fqn") String fqn,
      @Valid PipelineStatus pipelineStatus)
      throws IOException {
    OperationContext operationContext = new OperationContext(entityType, MetadataOperation.EDIT_STATUS);
    authorizer.authorize(securityContext, operationContext, getResourceContextByName(fqn));
    Pipeline pipeline = dao.addPipelineStatus(fqn, pipelineStatus);
    return addHref(uriInfo, pipeline);
  }

  @GET
  @Path("/{fqn}/status")
  @Operation(
      operationId = "listPipelineStatuses",
      summary = "List pipeline status",
      tags = "pipelines",
      description =
          "Get a list of pipeline status."
              + "parameter to get only necessary fields. Use cursor-based pagination to limit the number "
              + "entries in the list using `limit` and `before` or `after` query params.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of pipeline statuses.",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TestCaseResource.TestCaseList.class)))
      })
  public ResultList<PipelineStatus> list(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "FQN of the pipeline", schema = @Schema(type = "string")) @PathParam("fqn") String fqn,
      @Parameter(
              description = "Filter pipeline statues after the given start timestamp",
              schema = @Schema(type = "number"))
          @NotNull
          @QueryParam("startTs")
          Long startTs,
      @Parameter(
              description = "Filter pipeline statues before the given end timestamp",
              schema = @Schema(type = "number"))
          @NotNull
          @QueryParam("endTs")
          Long endTs)
      throws IOException {
    return dao.getPipelineStatuses(fqn, startTs, endTs);
  }

  @DELETE
  @Path("/{fqn}/status/{timestamp}")
  @Operation(
      operationId = "DeletePipelineStatus",
      summary = "Delete pipeline status.",
      tags = "pipelines",
      description = "Delete pipeline status for a pipeline.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Successfully deleted the PipelineStatus",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Pipeline.class)))
      })
  public Pipeline deletePipelineStatus(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the pipeline", schema = @Schema(type = "string")) @PathParam("fqn") String fqn,
      @Parameter(description = "Timestamp of the pipeline status", schema = @Schema(type = "long"))
          @PathParam("timestamp")
          Long timestamp)
      throws IOException {
    OperationContext operationContext = new OperationContext(entityType, MetadataOperation.EDIT_STATUS);
    authorizer.authorize(securityContext, operationContext, getResourceContextByName(fqn));
    Pipeline pipeline = dao.deletePipelineStatus(fqn, timestamp);
    return addHref(uriInfo, pipeline);
  }

  @PUT
  @Path("/{id}/followers")
  @Operation(
      operationId = "addFollower",
      summary = "Add a follower",
      tags = "pipelines",
      description = "Add a user identified by `userId` as follower of this pipeline",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "OK",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ChangeEvent.class))),
        @ApiResponse(responseCode = "404", description = "Pipeline for instance {id} is not found")
      })
  public Response addFollower(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the pipeline", schema = @Schema(type = "UUID")) @PathParam("id") UUID id,
      @Parameter(description = "Id of the user to be added as follower", schema = @Schema(type = "string")) UUID userId)
      throws IOException {
    return dao.addFollower(securityContext.getUserPrincipal().getName(), id, userId).toResponse();
  }

  @DELETE
  @Path("/{id}/followers/{userId}")
  @Operation(
      operationId = "deleteFollower",
      summary = "Remove a follower",
      tags = "pipelines",
      description = "Remove the user identified `userId` as a follower of the pipeline.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "OK",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ChangeEvent.class)))
      })
  public Response deleteFollower(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the pipeline", schema = @Schema(type = "UUID")) @PathParam("id") UUID id,
      @Parameter(description = "Id of the user being removed as follower", schema = @Schema(type = "UUID"))
          @PathParam("userId")
          UUID userId)
      throws IOException {
    return dao.deleteFollower(securityContext.getUserPrincipal().getName(), id, userId).toResponse();
  }

  @DELETE
  @Path("/{id}")
  @Operation(
      operationId = "deletePipeline",
      summary = "Delete a Pipeline",
      tags = "pipelines",
      description = "Delete a pipeline by `id`.",
      responses = {
        @ApiResponse(responseCode = "200", description = "OK"),
        @ApiResponse(responseCode = "404", description = "Pipeline for instance {id} is not found")
      })
  public Response delete(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Hard delete the entity. (Default = `false`)")
          @QueryParam("hardDelete")
          @DefaultValue("false")
          boolean hardDelete,
      @Parameter(description = "Pipeline Id", schema = @Schema(type = "UUID")) @PathParam("id") UUID id)
      throws IOException {
    return delete(uriInfo, securityContext, id, false, hardDelete);
  }

  @PUT
  @Path("/restore")
  @Operation(
      operationId = "restore",
      summary = "Restore a soft deleted Pipeline.",
      tags = "pipelines",
      description = "Restore a soft deleted Pipeline.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Successfully restored the Pipeline ",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Pipeline.class)))
      })
  public Response restorePipeline(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid RestoreEntity restore)
      throws IOException {
    return restoreEntity(uriInfo, securityContext, restore.getId());
  }

  private Pipeline getPipeline(CreatePipeline create, String user) throws IOException {
    return copy(new Pipeline(), create, user)
        .withService(create.getService())
        .withTasks(create.getTasks())
        .withPipelineUrl(create.getPipelineUrl())
        .withTags(create.getTags())
        .withConcurrency(create.getConcurrency())
        .withStartDate(create.getStartDate())
        .withPipelineLocation(create.getPipelineLocation());
  }
}
