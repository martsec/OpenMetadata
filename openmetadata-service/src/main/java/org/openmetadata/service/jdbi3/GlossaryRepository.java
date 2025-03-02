/*
 *  Licensed to the Apache Software Foundation (ASF) under one or more
 *  contributor license agreements. See the NOTICE file distributed with
 *  this work for additional information regarding copyright ownership.
 *  The ASF licenses this file to You under the Apache License, Version 2.0
 *  (the "License"); you may not use this file except in compliance with
 *  the License. You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.service.jdbi3;

import static org.openmetadata.common.utils.CommonUtil.listOrEmpty;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.openmetadata.schema.entity.data.Glossary;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.ProviderType;
import org.openmetadata.schema.type.Relationship;
import org.openmetadata.schema.type.TagLabel;
import org.openmetadata.schema.type.TagLabel.TagSource;
import org.openmetadata.service.Entity;
import org.openmetadata.service.exception.CatalogExceptionMessage;
import org.openmetadata.service.jdbi3.CollectionDAO.EntityRelationshipRecord;
import org.openmetadata.service.resources.glossary.GlossaryResource;
import org.openmetadata.service.util.EntityUtil;
import org.openmetadata.service.util.EntityUtil.Fields;

@Slf4j
public class GlossaryRepository extends EntityRepository<Glossary> {
  private static final String UPDATE_FIELDS = "owner,tags,reviewers";
  private static final String PATCH_FIELDS = "owner,tags,reviewers";

  public GlossaryRepository(CollectionDAO dao) {
    super(
        GlossaryResource.COLLECTION_PATH,
        Entity.GLOSSARY,
        Glossary.class,
        dao.glossaryDAO(),
        dao,
        PATCH_FIELDS,
        UPDATE_FIELDS);
  }

  @Override
  public Glossary setFields(Glossary glossary, Fields fields) throws IOException {
    glossary.setReviewers(fields.contains("reviewers") ? getReviewers(glossary) : null);
    return glossary.withUsageCount(fields.contains("usageCount") ? getUsageCount(glossary) : null);
  }

  @Override
  public void prepare(Glossary glossary) throws IOException {
    validateUsers(glossary.getReviewers());
  }

  @Override
  public void storeEntity(Glossary glossary, boolean update) throws IOException {
    // Relationships and fields such as href are derived and not stored as part of json
    EntityReference owner = glossary.getOwner();
    List<TagLabel> tags = glossary.getTags();
    List<EntityReference> reviewers = glossary.getReviewers();

    // Don't store owner, href and tags as JSON. Build it on the fly based on relationships
    glossary.withOwner(null).withHref(null).withTags(null);

    store(glossary, update);

    // Restore the relationships
    glossary.withOwner(owner).withTags(tags).withReviewers(reviewers);
  }

  @Override
  public void storeRelationships(Glossary glossary) {
    storeOwner(glossary, glossary.getOwner());
    applyTags(glossary);
    for (EntityReference reviewer : listOrEmpty(glossary.getReviewers())) {
      addRelationship(reviewer.getId(), glossary.getId(), Entity.USER, Entity.GLOSSARY, Relationship.REVIEWS);
    }
  }

  private Integer getUsageCount(Glossary glossary) {
    return daoCollection.tagUsageDAO().getTagCount(TagSource.GLOSSARY.ordinal(), glossary.getName());
  }

  @Override
  public EntityUpdater getUpdater(Glossary original, Glossary updated, Operation operation) {
    return new GlossaryUpdater(original, updated, operation);
  }

  private List<EntityReference> getReviewers(Glossary entity) throws IOException {
    List<EntityRelationshipRecord> ids = findFrom(entity.getId(), Entity.GLOSSARY, Relationship.REVIEWS, Entity.USER);
    return EntityUtil.populateEntityReferences(ids, Entity.USER);
  }

  /** Handles entity updated from PUT and POST operation. */
  public class GlossaryUpdater extends EntityUpdater {
    public GlossaryUpdater(Glossary original, Glossary updated, Operation operation) {
      super(original, updated, operation);
    }

    @Override
    public void entitySpecificUpdate() throws IOException {
      updateReviewers(original, updated);
      updateName(original, updated);
    }

    private void updateReviewers(Glossary origGlossary, Glossary updatedGlossary) throws JsonProcessingException {
      List<EntityReference> origUsers = listOrEmpty(origGlossary.getReviewers());
      List<EntityReference> updatedUsers = listOrEmpty(updatedGlossary.getReviewers());
      updateFromRelationships(
          "reviewers",
          Entity.USER,
          origUsers,
          updatedUsers,
          Relationship.REVIEWS,
          Entity.GLOSSARY,
          origGlossary.getId());
    }

    public void updateName(Glossary original, Glossary updated) throws IOException {
      if (!original.getName().equals(updated.getName())) {
        if (ProviderType.SYSTEM.equals(original.getProvider())) {
          throw new IllegalArgumentException(
              CatalogExceptionMessage.systemEntityRenameNotAllowed(original.getName(), entityType));
        }
        // Category name changed - update tag names starting from category and all the children tags
        LOG.info("Glossary name changed from {} to {}", original.getName(), updated.getName());
        daoCollection.glossaryTermDAO().updateFqn(original.getName(), updated.getName());
        daoCollection.tagUsageDAO().updateTagPrefix(original.getName(), updated.getName());
        recordChange("name", original.getName(), updated.getName());
      }
    }
  }
}
